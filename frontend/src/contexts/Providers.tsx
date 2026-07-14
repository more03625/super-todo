'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';
import { apiClient } from '@/services/api-client';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './ToastContext';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: 1 } },
  }));

  useEffect(() => {
    // Fire-and-forget wake-up ping on first page load (runs on every route,
    // including /login): /ping executes SELECT 1 server-side so a paused
    // free-tier database starts resuming before the user signs in. Generous
    // timeout because a cold database can take a while to come back.
    apiClient.get('/ping', { timeout: 60000 }).catch(() => {
      /* best-effort — never block or break the UI */
    });
  }, []);

  return (
    <ServerReadyGate>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ServerReadyGate>
  );
}
