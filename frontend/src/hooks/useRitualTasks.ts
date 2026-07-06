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

async function fetchTasksForRange(
  from: string,
  to: string,
  signal: AbortSignal,
): Promise<Task[]> {
  const params = new URLSearchParams({
    page: '1',
    limit: '100',
    sort_by: 'due_date',
    sort_order: 'asc',
    due_date_from: from,
    due_date_to: to,
  });
  const res = await apiClient.get(`/tasks?${params}`, { signal });
  const data = res.data.data as PaginatedResponse<Task>;
  return data.items;
}

interface UseRitualTasksParams {
  weekStart: string;
  weekEnd: string;
  monthStart: string;
  monthEnd: string;
}

export function useRitualTasks({ weekStart, weekEnd, monthStart, monthEnd }: UseRitualTasksParams) {
  const qc = useQueryClient();

  const weekQuery = useQuery({
    queryKey: ['tasks', 'week', weekStart, weekEnd],
    queryFn: ({ signal }) => fetchTasksForRange(weekStart, weekEnd, signal),
    enabled: Boolean(weekStart && weekEnd),
  });

  const monthQuery = useQuery({
    queryKey: ['tasks', 'month', monthStart, monthEnd],
    queryFn: ({ signal }) => fetchTasksForRange(monthStart, monthEnd, signal),
    enabled: Boolean(monthStart && monthEnd),
  });

  const tasksByDate = useMemo(() => {
    const weekTasks = weekQuery.data ?? [];
    const monthTasks = monthQuery.data ?? [];

    // Deduplicate by id before grouping — week and month ranges can overlap
    const seen = new Set<string>();
    const merged: Task[] = [];
    for (const t of [...weekTasks, ...monthTasks]) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        merged.push(t);
      }
    }
    return groupTasksByDate(merged);
  }, [weekQuery.data, monthQuery.data]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['tasks', 'week'] });
    qc.invalidateQueries({ queryKey: ['tasks', 'month'] });
  };

  const createMutation = useMutation({
    mutationFn: ({ dateKey, title }: { dateKey: string; title: string }) =>
      apiPost<Task>('/tasks', { title, due_date: dateKey }),
    onSuccess: invalidateAll,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      apiPut<Task>(`/tasks/${id}`, { status: done ? 'pending' : 'completed' }),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/tasks/${id}`),
    onSuccess: invalidateAll,
  });

  const allTasks = useMemo(() => {
    const weekTasks = weekQuery.data ?? [];
    const monthTasks = monthQuery.data ?? [];
    const seen = new Set<string>();
    const merged: Task[] = [];
    for (const t of [...weekTasks, ...monthTasks]) {
      if (!seen.has(t.id)) { seen.add(t.id); merged.push(t); }
    }
    return merged;
  }, [weekQuery.data, monthQuery.data]);

  async function addTask(dateKey: string, title: string): Promise<string> {
    const task = await createMutation.mutateAsync({ dateKey, title });
    return task.id;
  }

  function toggleTask(_dateKey: string, id: string) {
    const task = allTasks.find((t) => t.id === id);
    if (!task) return;
    toggleMutation.mutate({ id, done: task.status === 'completed' });
  }

  function deleteTask(_dateKey: string, id: string) {
    deleteMutation.mutate(id);
  }

  return {
    tasksByDate,
    isLoading: weekQuery.isLoading && monthQuery.isLoading,
    isWeekLoading: weekQuery.isFetching,
    isMonthLoading: monthQuery.isFetching,
    isError: weekQuery.isError || monthQuery.isError,
    refetch: () => {
      weekQuery.refetch();
      monthQuery.refetch();
    },
    addTask,
    toggleTask,
    deleteTask,
    getErrorMessage,
    isMutating: createMutation.isPending || toggleMutation.isPending || deleteMutation.isPending,
  };
}
