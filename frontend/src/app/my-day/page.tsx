'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { prefetchTaskDetail } from '@/hooks/useRitualTasks';
import { apiClient, apiPut, getErrorMessage } from '@/services/api-client';
import type { PaginatedResponse, Task } from '@/types';
import { COLORS, cardStyle, localDateKey } from '@/components/task-detail/theme';

export default function MyDayPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const { showToast } = useToast();
  const today = localDateKey();
  const myDayKey = ['tasks', 'my-day', today];

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  const tasksQuery = useQuery({
    queryKey: myDayKey,
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ page: '1', limit: '100', my_day_date: today, sort_by: 'position', sort_order: 'asc' });
      const res = await apiClient.get(`/tasks?${params}`, { signal });
      return (res.data.data as PaginatedResponse<Task>).items;
    },
    enabled: Boolean(user),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      apiPut<Task>(`/tasks/${id}`, { status: done ? 'completed' : 'pending' }),
    onMutate: ({ id, done }) => {
      qc.setQueryData<Task[]>(myDayKey, (old) =>
        old?.map((t) => (t.id === id ? { ...t, status: done ? 'completed' : 'pending' } : t)),
      );
    },
    onError: (error) => showToast(`Couldn't update task — ${getErrorMessage(error)}`, 'error'),
    onSettled: () => void qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const tasks = tasksQuery.data ?? [];

  useEffect(() => {
    for (const t of tasks) prefetchTaskDetail(qc, t.id);
  }, [tasks, qc]);

  if (loading || !user) return null;

  return (
    <div style={{ background: COLORS.bg, minHeight: '100dvh', fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => router.push('/')}
            aria-label="Back to today"
            style={{ display: 'flex', alignItems: 'center', color: COLORS.accent, cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft size={18} />
          </button>
          <Sun size={20} color={COLORS.accent} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.hi, margin: 0 }}>My Day</h1>
        </div>

        {tasksQuery.isPending ? (
          <p style={{ color: COLORS.mid, fontSize: 14, textAlign: 'center' }}>Loading…</p>
        ) : tasks.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: COLORS.mid, fontSize: 14 }}>
            Nothing in My Day yet. Open a task and tap &quot;Add to My Day&quot;.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.map((task) => {
              const done = task.status === 'completed';
              return (
                <div key={task.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                    onClick={() => toggleMutation.mutate({ id: task.id, done: !done })}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      border: `1.5px solid ${done ? COLORS.mint : COLORS.borderStrong}`,
                      background: done ? COLORS.mint : 'transparent',
                      flexShrink: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {done && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="#FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span
                    onClick={() => router.push(`/tasks/${task.id}`)}
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: done ? COLORS.low : COLORS.hi,
                      textDecoration: done ? 'line-through' : 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {task.title}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
