'use client';

import { useQuery } from '@tanstack/react-query';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { LineChart } from '@/components/charts/Charts';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { apiGet } from '@/services/api-client';

interface WeeklyReport {
  week_start: string;
  tasks_completed: number;
  completion_percent: number;
  daily_score_average: number;
  best_day: { date: string; score: number } | null;
  worst_day: { date: string; score: number } | null;
  longest_streak: number;
  daily_scores: Array<{ date: string; score: number }>;
}

export default function WeeklyReportPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-weekly'],
    queryFn: () => apiGet<WeeklyReport>('/reports/weekly'),
  });

  return (
    <ProtectedLayout>
      <PageHeader title="Weekly Report" subtitle={`Week of ${data?.week_start || '...'}`} />
      {isError && <div className="mb-4 text-sm text-red-500">Failed to load. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
      {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div> : data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Completed" value={data.tasks_completed} />
            <StatCard label="Completion %" value={`${data.completion_percent}%`} />
            <StatCard label="Avg Score" value={data.daily_score_average} />
            <StatCard label="Longest Streak" value={`${data.longest_streak}d`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2"><h5 className="mb-4 font-semibold">Daily Score Trend</h5><LineChart labels={data.daily_scores.map(d => d.date.slice(5))} data={data.daily_scores.map(d => d.score)} /></div>
            <div className="space-y-4">
              <div className="card p-5"><p className="text-sm text-muted">Best Day</p><p className="text-3xl font-bold text-emerald-600">{data.best_day?.score ?? '—'}</p><p className="text-xs text-muted">{data.best_day?.date}</p></div>
              <div className="card p-5"><p className="text-sm text-muted">Worst Day</p><p className="text-3xl font-bold text-red-500">{data.worst_day?.score ?? '—'}</p><p className="text-xs text-muted">{data.worst_day?.date}</p></div>
            </div>
          </div>
        </>
      )}
    </ProtectedLayout>
  );
}
