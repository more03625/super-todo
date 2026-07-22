import axios, { AxiosError } from 'axios';
import type { OpenApiErrorResponse, OpenApiSuccessResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

let pendingRequests = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (event) => {
    if (pendingRequests > 0) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

apiClient.interceptors.request.use((config) => {
  pendingRequests++;
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/** In-flight refresh call, shared by all concurrent 401s so only one
 *  /auth/refresh request ever goes out at a time — the backend rotates
 *  refresh tokens, so a second concurrent call would consume an
 *  already-used token and fail. */
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) throw new Error('No refresh token');
  const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh });
  const data = res.data as OpenApiSuccessResponse<{ access_token: string; refresh_token: string }>;
  localStorage.setItem('access_token', data.data.access_token);
  localStorage.setItem('refresh_token', data.data.refresh_token);
  return data.data.access_token;
}

apiClient.interceptors.response.use(
  (response) => {
    pendingRequests--;
    return response;
  },
  async (error: AxiosError<OpenApiErrorResponse>) => {
    pendingRequests--;
    const original = error.config;
    if (error.response?.status === 401 && original && !original.url?.includes('/auth/')) {
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const accessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export async function pingServer(timeoutMs = 20000): Promise<boolean> {
  try {
    await axios.get(`${API_URL}/ping`, { timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as {
      detail?: OpenApiErrorResponse;
      error?: OpenApiErrorResponse['error'];
    } | undefined;
    if (data?.detail?.error?.message) return data.detail.error.message;
    if (data?.error?.message) return data.error.message;
    return error.message;
  }
  return 'Something went wrong';
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await apiClient.get<OpenApiSuccessResponse<T>>(url);
  return res.data.data;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.post<OpenApiSuccessResponse<T>>(url, body);
  return res.data.data;
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  const res = await apiClient.put<OpenApiSuccessResponse<T>>(url, body);
  return res.data.data;
}

export async function apiDelete(url: string): Promise<void> {
  await apiClient.delete(url);
}
