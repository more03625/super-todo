'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { StatCard } from '@/components/ui/StatCard';
import { LineChart, ProductivityHeatmap } from '@/components/charts/Charts';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { apiGet } from '@/services/api-client';
import type { Achievement, HeatmapDay } from '@/types';
import { cn } from '@/lib/utils';

interface YearlyReport {
  year: number;
  total_tasks: number;
  average_daily_score: number;
  most_productive_month: number;
  longest_streak: number;
  achievements: Achievement[];
  heatmap: HeatmapDay[];
  monthly_trend: Array<{ month: number; average_score: number }>;
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function YearlyReportPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-yearly'],
    queryFn: () => apiGet<YearlyReport>('/reports/yearly'),
  });

  return (
    <ProtectedLayout>
      <div className="mb-6 flex gap-2">
        {(['weekly', 'monthly', 'yearly'] as const).map((key) => (
          <Link key={key} href={`/reports/${key}`} className={cn('rounded-lg px-3 py-1.5 text-sm font-medium capitalize', key === 'yearly' ? 'bg-brand-500 text-white' : 'border border-border text-muted hover:text-foreground')}>{key}</Link>
        ))}
      </div>
      {isError && <div className="mb-4 text-sm text-red-500">Failed to load. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
      {isLoading ? <SkeletonCard /> : data && (
        <>
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-brand-600 via-violet-600 to-fuchsia-600 p-10 text-white">
            <h1 className="text-4xl font-bold">Your {data.year} Wrapped</h1>
            <p className="mt-2 text-lg text-white/80">A year of productivity, growth, and achievement.</p>
          </div>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Tasks" value={data.total_tasks} />
            <StatCard label="Avg Daily Score" value={data.average_daily_score} />
            <StatCard label="Best Month" value={MONTHS[data.most_productive_month]} />
            <StatCard label="Longest Streak" value={`${data.longest_streak}d`} />
          </div>
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="card p-5 lg:col-span-2"><h5 className="mb-4 font-semibold">Monthly Trend</h5><LineChart labels={data.monthly_trend.map(m => MONTHS[m.month])} data={data.monthly_trend.map(m => m.average_score)} label="Avg Score" /></div>
            <div className="card p-5"><h5 className="mb-4 font-semibold">Achievements</h5><div className="flex flex-wrap gap-2">{data.achievements.filter(a => a.unlocked).map(a => <span key={a.id} className="badge bg-brand-500/15 text-brand-600">{a.name}</span>)}</div></div>
          </div>
          <div className="card p-5"><h5 className="mb-4 font-semibold">Year in Review</h5><ProductivityHeatmap days={data.heatmap} range="1y" onRangeChange={() => {}} /></div>
        </>
      )}
    </ProtectedLayout>
  );
}
