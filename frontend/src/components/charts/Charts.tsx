'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { HeatmapDay } from '@/types';
import { cn } from '@/lib/utils';

Chart.register(...registerables);

function chartColors() {
  if (typeof window === 'undefined') return { accent: '#6366f1', muted: '#6b7280', border: '#e8eaef' };
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return {
    accent: style.getPropertyValue('--color-navy-500').trim() || '#4a47ff',
    muted: style.getPropertyValue('--color-muted').trim() || '#6b7280',
    border: style.getPropertyValue('--color-border').trim() || '#e8eaef',
  };
}

export function LineChart({ labels, data, label = 'Score' }: { labels: string[]; data: number[]; label?: string }) {
  const { accent, muted, border } = chartColors();
  return (
    <Line
      data={{
        labels,
        datasets: [{
          label,
          data,
          borderColor: accent,
          backgroundColor: `${accent}33`,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        }],
      }}
      options={{
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: border }, ticks: { color: muted } },
          y: { grid: { color: border }, ticks: { color: muted }, beginAtZero: true, max: 100 },
        },
      }}
    />
  );
}

const LEVEL_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

export function ProductivityHeatmap({ days, range, onRangeChange }: {
  days: HeatmapDay[];
  range: string;
  onRangeChange: (r: string) => void;
}) {
  const ranges = [
    { key: '1m', label: '1 Month' },
    { key: '3m', label: '3 Months' },
    { key: '6m', label: '6 Months' },
    { key: '1y', label: '1 Year' },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {ranges.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => onRangeChange(r.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              range === r.key ? 'bg-navy-500 text-white' : 'border border-border bg-surface text-muted hover:text-foreground',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.score}`}
            className="h-3 w-3 cursor-pointer rounded-sm transition-transform hover:scale-125"
            style={{ backgroundColor: LEVEL_COLORS[d.level] || LEVEL_COLORS[0] }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span>Less</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} className="h-3 w-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export function PieChartWrapper({ labels, data, colors }: { labels: string[]; data: number[]; colors: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
    });
    return () => chartRef.current?.destroy();
  }, [labels, data, colors]);

  return <canvas ref={canvasRef} />;
}
