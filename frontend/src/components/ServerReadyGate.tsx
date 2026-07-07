'use client';

import { useEffect, useState, ReactNode } from 'react';
import { pingServer } from '@/services/api-client';

const RETRY_DELAY_MS = 3000;

export function ServerReadyGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const attemptPing = async () => {
      const ok = await pingServer();
      if (cancelled) return;
      if (ok) {
        setReady(true);
      } else {
        setTimeout(attemptPing, RETRY_DELAY_MS);
      }
    };

    attemptPing();
    return () => {
      cancelled = true;
    };
  }, []);

  if (ready) return <>{children}</>;

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#F4F6F9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2px solid #D8DCE3',
          borderTopColor: '#2563EB',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <div>
        <p style={{ fontWeight: 600, color: '#1E293B' }}>Waking up backend services...</p>
        <p style={{ marginTop: 4, fontSize: 14, color: '#64748B' }}>
          This can take up to a minute on the first request.
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
