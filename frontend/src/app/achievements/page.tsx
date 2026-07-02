'use client';

import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { apiGet } from '@/services/api-client';
import type { Achievement } from '@/types';
import { cn } from '@/lib/utils';

export default function AchievementsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => apiGet<Achievement[]>('/achievements'),
  });

  return (
    <ProtectedLayout>
      <PageHeader title="Achievements" subtitle="Unlock badges as you progress" />
      {isError && <div className="mb-4 text-sm text-red-500">Failed to load. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
      {isLoading ? <SkeletonList count={6} /> : !data?.length ? (
        <EmptyState title="No achievements defined" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map((a) => (
            <div key={a.id} className={cn('card p-6 text-center', !a.unlocked && 'opacity-50 grayscale')}>
              <Trophy className={cn('mx-auto mb-3 h-10 w-10', a.unlocked ? 'text-navy-500' : 'text-muted')} />
              <h6 className="font-semibold text-foreground">{a.name}</h6>
              <p className="mt-1 text-sm text-muted">{a.description}</p>
              {a.unlocked && a.unlocked_at && <p className="mt-2 text-xs text-emerald-600">Unlocked {new Date(a.unlocked_at).toLocaleDateString()}</p>}
            </div>
          ))}
        </div>
      )}
    </ProtectedLayout>
  );
}
