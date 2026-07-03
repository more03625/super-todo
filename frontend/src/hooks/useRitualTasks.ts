import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, apiDelete, apiPost, apiPut, getErrorMessage } from '@/services/api-client';
import type { PaginatedResponse, Task } from '@/types';

export type RitualTask = { id: string; title: string; done: boolean };

export type TasksByDate = Record<string, RitualTask[]>;

function toRitualTask(task: Task): RitualTask {
  return {
    id: task.id,
    title: task.title,
    done: task.status === 'completed',
  };
}

/** Resolve which calendar day a task belongs to (due_date preferred, else created_at local). */
export function taskDateKey(task: Task): string {
  if (task.due_date) return task.due_date;
  const d = new Date(task.created_at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function groupTasksByDate(tasks: Task[]): TasksByDate {
  const map: TasksByDate = {};
  for (const task of tasks) {
    const key = taskDateKey(task);
    if (!map[key]) map[key] = [];
    map[key].push(toRitualTask(task));
  }
  return map;
}

async function fetchAllTasks(): Promise<Task[]> {
  const params = new URLSearchParams({ page: '1', limit: '100', sort_by: 'created_at', sort_order: 'desc' });
  const res = await apiClient.get(`/tasks?${params}`);
  const data = res.data.data as PaginatedResponse<Task>;
  return data.items;
}

export function useRitualTasks() {
  const qc = useQueryClient();

  const { data: tasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: fetchAllTasks,
  });

  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tasks'] });

  const createMutation = useMutation({
    mutationFn: ({ dateKey, title }: { dateKey: string; title: string }) =>
      apiPost<Task>('/tasks', { title, due_date: dateKey }),
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      apiPut<Task>(`/tasks/${id}`, { status: done ? 'pending' : 'completed' }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/tasks/${id}`),
    onSuccess: invalidate,
  });

  async function addTask(dateKey: string, title: string): Promise<string> {
    const task = await createMutation.mutateAsync({ dateKey, title });
    return task.id;
  }

  function toggleTask(_dateKey: string, id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    toggleMutation.mutate({ id, done: task.status === 'completed' });
  }

  function deleteTask(_dateKey: string, id: string) {
    deleteMutation.mutate(id);
  }

  return {
    tasksByDate,
    isLoading,
    isError,
    refetch,
    addTask,
    toggleTask,
    deleteTask,
    getErrorMessage,
    isMutating: createMutation.isPending || toggleMutation.isPending || deleteMutation.isPending,
  };
}
