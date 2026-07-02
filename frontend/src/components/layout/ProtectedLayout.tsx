'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { TodoShell } from '@/components/layout/TodoShell';
import { SkeletonList } from '@/components/ui/SkeletonCard';

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="p-6">
        <SkeletonList count={4} />
      </div>
    );
  }

  if (!user) return null;

  return <TodoShell>{children}</TodoShell>;
}
