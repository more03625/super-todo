'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sun } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { CompletedSection } from '@/components/tasks/CompletedSection';
import { QuickAddInput } from '@/components/tasks/QuickAddInput';
import { TaskRow } from '@/components/tasks/TaskRow';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { useToast } from '@/contexts/ToastContext';
import { apiClient, apiDelete, apiPost, apiPut, getErrorMessage } from '@/services/api-client';
import type { PaginatedResponse, Task } from '@/types';

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function MyDayPage() {
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      const res = await apiClient.get(`/tasks?${params}`);
      return res.data.data as PaginatedResponse<Task>;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] });

  const createTask = useMutation({
    mutationFn: (title: string) => apiPost<Task>('/tasks', { title }),
    onSuccess: () => { invalidate(); showToast('Task added', 'success'); },
    onError: (e) => showToast(getErrorMessage(e), 'error'),
  });

  const toggleComplete = useMutation({
    mutationFn: (task: Task) =>
      apiPut<Task>(`/tasks/${task.id}`, {
        status: task.status === 'completed' ? 'pending' : 'completed',
      }),
    onSuccess: () => invalidate(),
    onError: (e) => showToast(getErrorMessage(e), 'error'),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => apiDelete(`/tasks/${id}`),
    onSuccess: () => { invalidate(); showToast('Task deleted', 'success'); },
    onError: (e) => showToast(getErrorMessage(e), 'error'),
  });

  const renameTask = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => apiPut<Task>(`/tasks/${id}`, { title }),
    onSuccess: () => invalidate(),
    onError: (e) => showToast(getErrorMessage(e), 'error'),
  });

  const handleRename = (id: string, title: string) => {
    renameTask.mutate({ id, title });
  };

  const items = data?.items ?? [];
  const activeTasks = items.filter((t) => t.status !== 'completed');
  const completedTasks = items.filter((t) => t.status === 'completed');

  return (
    <ProtectedLayout>
      <div className="todo-main">
        <div className="px-6 pt-8 sm:px-10">
          <div className="flex items-center gap-3">
            <Sun className="h-8 w-8 text-gold-500" />
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">My Day</h1>
              <p className="mt-0.5 text-sm text-muted">{formatToday()}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-28 sm:px-10">
          {isError && (
            <div className="mb-4 text-sm text-red-600">
              Failed to load tasks.{' '}
              <button type="button" className="underline" onClick={() => refetch()}>
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <SkeletonList count={4} />
          ) : activeTasks.length === 0 && completedTasks.length === 0 ? (
            <div className="todo-empty mt-16">
              <Sun className="mx-auto mb-4 h-12 w-12 text-gold-500" />
              <h2 className="text-lg font-semibold text-foreground">Focus on your day</h2>
              <p className="mt-2 text-sm text-muted">
                Get things done with My Day. Add a task using the bar below.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-0">
                {activeTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={(t) => toggleComplete.mutate(t)}
                    onDelete={(id) => deleteTask.mutate(id)}
                    onRename={handleRename}
                  />
                ))}
              </div>
              <CompletedSection
                tasks={completedTasks}
                onToggle={(t) => toggleComplete.mutate(t)}
                onDelete={(id) => deleteTask.mutate(id)}
                onRename={handleRename}
              />
            </>
          )}
        </div>

        <QuickAddInput
          onAdd={async (title) => { await createTask.mutateAsync(title); }}
          disabled={createTask.isPending}
        />
      </div>
    </ProtectedLayout>
  );
}
