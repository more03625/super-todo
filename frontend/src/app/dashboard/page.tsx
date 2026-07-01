'use client';

import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Flame, Trophy, TrendingUp, Award } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { SkeletonCard, SkeletonList } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PieChartWrapper } from '@/components/charts/Charts';
import { apiGet } from '@/services/api-client';
import type { DashboardData, TaskPriority } from '@/types';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardData>('/dashboard'),
  });

  return (
    <ProtectedLayout>
      <PageHeader title="Dashboard" subtitle="Your productivity at a glance" />

      {isError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
          Failed to load dashboard. <button type="button" className="ml-2 underline" onClick={() => refetch()}>Retry</button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkeletonCard />
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
          <div className="col-span-full"><SkeletonList count={3} /></div>
        </div>
      ) : data ? (
        <>
          <div className="mb-6 grid gap-4 lg:grid-cols-12">
            <div className="card flex flex-col items-center p-6 lg:col-span-4">
              <ScoreRing score={data.today_score} />
              {data.score_breakdown && (
                <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted">
                  {Object.entries(data.score_breakdown).map(([k, v]) => (
                    <span key={k}>{k.replace(/_/g, ' ')}: {v}%</span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-3">
              <StatCard label="Completed Today" value={data.tasks_completed_today} icon={<CheckCircle2 className="h-5 w-5" />} />
              <StatCard label="Pending Today" value={data.tasks_pending_today} icon={<Clock className="h-5 w-5" />} />
              <StatCard label="Current Streak" value={`${data.current_streak}d`} icon={<Flame className="h-5 w-5" />} />
              <StatCard label="Longest Streak" value={`${data.longest_streak}d`} icon={<Trophy className="h-5 w-5" />} />
              <StatCard label="Weekly Progress" value={`${data.weekly_progress}%`} icon={<TrendingUp className="h-5 w-5" />} />
              <StatCard label="Achievements" value={data.achievement_count} icon={<Award className="h-5 w-5" />} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h5 className="mb-4 font-semibold text-foreground">Today&apos;s Tasks</h5>
              {data.today_tasks.length === 0 ? (
                <EmptyState title="No tasks today" description="Create a task to get started" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.today_tasks.map((t) => (
                    <li key={t.id} className={cn('flex items-center justify-between py-3', t.status === 'completed' && 'opacity-60 line-through')}>
                      <span>{t.title}</span>
                      <PriorityBadge priority={t.priority as TaskPriority} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-5">
              <h5 className="mb-4 font-semibold text-foreground">Recent Activity</h5>
              {data.recent_activity.length === 0 ? (
                <EmptyState title="No activity yet" />
              ) : (
                <ul className="divide-y divide-border">
                  {data.recent_activity.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                      <span className="text-foreground">{a.event_type}</span>
                      <span className="text-muted">{new Date(a.created_at).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-5">
              <h5 className="mb-4 font-semibold">Category Distribution</h5>
              {data.category_distribution.length > 0 ? (
                <PieChartWrapper labels={data.category_distribution.map((c) => c.name)} data={data.category_distribution.map((c) => c.count)} colors={data.category_distribution.map((c) => c.color)} />
              ) : <EmptyState title="No categories yet" />}
            </div>
            <div className="card p-5">
              <h5 className="mb-4 font-semibold">Life Area Distribution</h5>
              {data.life_area_distribution.length > 0 ? (
                <PieChartWrapper labels={data.life_area_distribution.map((c) => c.name)} data={data.life_area_distribution.map((c) => c.count)} colors={data.life_area_distribution.map((c) => c.color)} />
              ) : <EmptyState title="No life areas yet" />}
            </div>
          </div>
        </>
      ) : null}
    </ProtectedLayout>
  );
}
