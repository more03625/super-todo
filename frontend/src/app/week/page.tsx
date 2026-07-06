'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { WeekSkeleton } from '@/components/WeekSkeleton';
import { WeekApp } from '@/ritual-preview';

export default function WeekPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Skeleton instead of a blank screen so the tap feels instant.
  if (loading || !user) return <WeekSkeleton />;

  return <WeekApp />;
}
