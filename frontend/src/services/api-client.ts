import axios, { AxiosError } from 'axios';
import type { OpenApiErrorResponse, OpenApiSuccessResponse } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<OpenApiErrorResponse>) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original.url?.includes('/auth/')) {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refresh });
          const data = res.data as OpenApiSuccessResponse<{ access_token: string; refresh_token: string }>;
          localStorage.setItem('access_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);
          original.headers.Authorization = `Bearer ${data.data.access_token}`;
          return apiClient(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (typeof window !== 'undefined') window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

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
