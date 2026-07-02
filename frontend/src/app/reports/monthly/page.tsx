'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { ProductivityHeatmap } from '@/components/charts/Charts';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { apiGet } from '@/services/api-client';
import type { HeatmapDay } from '@/types';
import { cn } from '@/lib/utils';

interface MonthlyReport {
  month: string;
  tasks_completed: number;
  completion_percent: number;
  average_score: number;
  achievements_unlocked: number;
  heatmap: HeatmapDay[];
}

function ReportTabs({ active }: { active: 'weekly' | 'monthly' | 'yearly' }) {
  const tabs = [
    { href: '/reports/weekly', key: 'weekly' as const, label: 'Weekly' },
    { href: '/reports/monthly', key: 'monthly' as const, label: 'Monthly' },
    { href: '/reports/yearly', key: 'yearly' as const, label: 'Yearly' },
  ];
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium', active === t.key ? 'bg-navy-500 text-white' : 'border border-border text-muted hover:text-foreground')}>{t.label}</Link>
      ))}
    </div>
  );
}

export default function MonthlyReportPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-monthly'],
    queryFn: () => apiGet<MonthlyReport>('/reports/monthly'),
  });

  return (
    <ProtectedLayout>
      <PageHeader title="Monthly Report" subtitle={data?.month || ''} action={<ReportTabs active="monthly" />} />
      {isError && <div className="mb-4 text-sm text-red-500">Failed to load. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
      {isLoading ? <SkeletonCard /> : data && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Tasks Completed" value={data.tasks_completed} />
            <StatCard label="Completion %" value={`${data.completion_percent}%`} />
            <StatCard label="Average Score" value={data.average_score} />
            <StatCard label="Achievements" value={data.achievements_unlocked} />
          </div>
          <div className="card p-5"><h5 className="mb-4 font-semibold">Productivity Heatmap</h5><ProductivityHeatmap days={data.heatmap} range="1m" onRangeChange={() => {}} /></div>
        </>
      )}
    </ProtectedLayout>
  );
}
