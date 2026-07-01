'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ProductivityHeatmap } from '@/components/charts/Charts';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { apiGet } from '@/services/api-client';
import type { HeatmapDay } from '@/types';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  broken_count: number;
}

export default function StreaksPage() {
  const [range, setRange] = useState('3m');
  const { data: streak, isLoading } = useQuery({ queryKey: ['streaks'], queryFn: () => apiGet<StreakData>('/streaks') });
  const { data: heatmap } = useQuery({ queryKey: ['heatmap', range], queryFn: () => apiGet<HeatmapDay[]>(`/heatmap?range=${range}`) });

  return (
    <ProtectedLayout>
      <PageHeader title="Streak Dashboard" subtitle="Track your consistency" />
      {isLoading ? <SkeletonCard /> : streak && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Current Streak" value={`${streak.current_streak} days`} />
            <StatCard label="Longest Streak" value={`${streak.longest_streak} days`} />
            <StatCard label="Broken Streaks" value={streak.broken_count} />
          </div>
          <div className="card p-5"><h5 className="mb-4 font-semibold">Activity Heat Strip</h5>{heatmap && <ProductivityHeatmap days={heatmap} range={range} onRangeChange={setRange} />}</div>
        </>
      )}
    </ProtectedLayout>
  );
}
