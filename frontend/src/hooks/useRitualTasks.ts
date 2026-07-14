import { useMemo } from 'react';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { apiClient, apiDelete, apiPost, apiPut, getErrorMessage } from '@/services/api-client';
import { useToast } from '@/contexts/ToastContext';
import type { PaginatedResponse, Task, TaskStatus } from '@/types';

export type RitualTask = {
  id: string;
  /** Real task id (differs from `id` for projected recurrence occurrences). */
  sourceId: string;
  title: string;
  done: boolean;
  pending: boolean;
  /** Projected future occurrence of a recurring task — display-only. */
  virtual: boolean;
};

export type TasksByDate = Record<string, RitualTask[]>;

const TEMP_PREFIX = 'temp-';

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_PREFIX);
}

function newTempId(): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${TEMP_PREFIX}${uuid}`;
}

function toRitualTask(task: Task): RitualTask {
  return {
    id: task.id,
    sourceId: task.id,
    title: task.title,
    done: task.status === 'completed',
    pending: isTempId(task.id),
    virtual: false,
  };
}

/* ---------------- local-date helpers (never UTC-parse date keys) ---------------- */

function fmtKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDaysLocal(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function addMonthsClamped(d: Date, n: number): Date {
  const total = d.getFullYear() * 12 + d.getMonth() + n;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(d.getDate(), lastDay));
}

function weekStartMonday(d: Date): Date {
  return addDaysLocal(d, -((d.getDay() + 6) % 7));
}

/**
 * Next occurrence strictly after `base` — mirrors backend
 * app/utils/recurrence.py (bit 0 of the weekday mask = Monday).
 */
function nextOccurrence(base: Date, unit: string, interval: number | null, mask: number | null): Date {
  const n = Math.max(1, interval ?? 1);
  if (unit === 'day') return addDaysLocal(base, n);
  if (unit === 'week') {
    if (!mask) return addDaysLocal(base, 7 * n);
    const baseWeek = weekStartMonday(base);
    let candidate = addDaysLocal(base, 1);
    for (let i = 0; i < n * 7 + 7; i++) {
      const weeksApart = Math.round((weekStartMonday(candidate).getTime() - baseWeek.getTime()) / (7 * 86400000));
      const bit = (candidate.getDay() + 6) % 7;
      if (weeksApart % n === 0 && (mask & (1 << bit)) !== 0) return candidate;
      candidate = addDaysLocal(candidate, 1);
    }
    return addDaysLocal(base, 7 * n);
  }
  if (unit === 'month') return addMonthsClamped(base, n);
  return addMonthsClamped(base, 12 * n);
}

/** Resolve which calendar day a task belongs to (due_date preferred, else created_at local). */
export function taskDateKey(task: Task): string {
  if (task.due_date) return task.due_date;
  return fmtKey(new Date(task.created_at));
}

/** Manual order first (position asc, nulls last), then creation order. */
function byPosition(a: Task, b: Task): number {
  const pa = a.position ?? Number.MAX_SAFE_INTEGER;
  const pb = b.position ?? Number.MAX_SAFE_INTEGER;
  if (pa !== pb) return pa - pb;
  return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
}

/**
 * Expand tasks onto calendar days:
 * - base day (due date, else creation day)
 * - pinned My Day date ("copied" into that day's list)
 * - every day from creation until the due date (deadline countdown)
 * - projected future occurrences of recurring tasks (virtual, display-only)
 */
export function groupTasksByDate(tasks: Task[], rangeStart?: string, rangeEnd?: string): TasksByDate {
  const grouped = new Map<string, Map<string, { task: Task; virtual: boolean }>>();

  function push(key: string, task: Task, virtual: boolean) {
    let day = grouped.get(key);
    if (!day) {
      day = new Map();
      grouped.set(key, day);
    }
    const existing = day.get(task.id);
    // A real entry always wins over a projected one for the same day.
    if (!existing || (existing.virtual && !virtual)) day.set(task.id, { task, virtual });
  }

  for (const task of tasks) {
    const baseKey = taskDateKey(task);
    push(baseKey, task, false);

    if (task.my_day_date && task.my_day_date !== baseKey) {
      push(task.my_day_date, task, false);
    }

    if (task.due_date) {
      const createdKey = fmtKey(new Date(task.created_at));
      if (createdKey < task.due_date) {
        const startKey = rangeStart && rangeStart > createdKey ? rangeStart : createdKey;
        const endKey = rangeEnd && rangeEnd < task.due_date ? rangeEnd : task.due_date;
        for (let d = parseKey(startKey); fmtKey(d) <= endKey; d = addDaysLocal(d, 1)) {
          push(fmtKey(d), task, false);
        }
      }
    }

    if (task.recurrence_unit && task.status !== 'completed' && rangeEnd) {
      let cursor = parseKey(baseKey);
      for (let guard = 0; guard < 120; guard++) {
        cursor = nextOccurrence(cursor, task.recurrence_unit, task.recurrence_interval, task.recurrence_weekdays);
        const key = fmtKey(cursor);
        if (key > rangeEnd) break;
        push(key, task, true);
      }
    }
  }

  const map: TasksByDate = {};
  for (const [key, day] of grouped) {
    map[key] = Array.from(day.values())
      .sort((a, b) => byPosition(a.task, b.task))
      .map(({ task, virtual }) =>
        virtual
          ? { ...toRitualTask(task), id: `${task.id}::${key}`, done: false, virtual: true }
          : toRitualTask(task),
      );
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

/* ---------------- optimistic-write bookkeeping ----------------
 * Module-level so a task created on one page can be toggled/deleted from
 * another before the server has confirmed it (each page mounts its own hook
 * instance, but all instances share one QueryClient cache).
 */

/** temp id → real server id, filled in when a create confirms. */
const idMap = new Map<string, string>();

/** Actions taken on a still-saving (temp-id) task, flushed once the real id arrives. */
type PendingOps = { desiredDone?: boolean; deleted?: boolean };
const pendingOps = new Map<string, PendingOps>();

/** Per-task promise chains so writes to the same task hit the server in order. */
const writeChains = new Map<string, Promise<unknown>>();

function serialized<T>(taskId: string, op: () => Promise<T>): Promise<T> {
  const prev = writeChains.get(taskId) ?? Promise.resolve();
  const next = prev.then(op, op);
  next.then(
    () => {
      if (writeChains.get(taskId) === next) writeChains.delete(taskId);
    },
    () => {
      if (writeChains.get(taskId) === next) writeChains.delete(taskId);
    },
  );
  return next;
}

/* ---------------- cache helpers ---------------- */

const TASK_SCOPES = ['week', 'month'] as const;

type RemovedEntry = { key: QueryKey; task: Task; index: number };

function forEachTaskCache(
  qc: QueryClient,
  fn: (key: QueryKey, tasks: Task[]) => Task[] | undefined,
): void {
  for (const scope of TASK_SCOPES) {
    for (const [key, data] of qc.getQueriesData<Task[]>({ queryKey: ['tasks', scope] })) {
      if (!data) continue;
      const next = fn(key, data);
      if (next && next !== data) qc.setQueryData(key, next);
    }
  }
}

/** Query keys look like ['tasks', scope, from, to]; ISO date strings compare lexically. */
function keyContainsDate(key: QueryKey, dk: string): boolean {
  const from = key[2];
  const to = key[3];
  return typeof from === 'string' && typeof to === 'string' && from <= dk && dk <= to;
}

function optimisticTask(id: string, title: string, dueDate: string): Task {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description: null,
    priority: 'medium',
    status: 'pending',
    category_id: null,
    life_area_id: null,
    estimated_minutes: null,
    actual_minutes: null,
    due_date: dueDate,
    completed_at: null,
    is_archived: false,
    is_deleted: false,
    position: null,
    my_day_date: null,
    recurrence_unit: null,
    recurrence_interval: null,
    recurrence_weekdays: null,
    created_at: now,
    updated_at: now,
  };
}

function insertTaskIntoCaches(qc: QueryClient, task: Task): void {
  const dk = taskDateKey(task);
  forEachTaskCache(qc, (key, tasks) => {
    if (!keyContainsDate(key, dk) || tasks.some((t) => t.id === task.id)) return undefined;
    return [...tasks, task];
  });
}

function patchTaskInCaches(qc: QueryClient, id: string, patch: Partial<Task>): void {
  forEachTaskCache(qc, (_key, tasks) => {
    if (!tasks.some((t) => t.id === id)) return undefined;
    return tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
  });
}

/** Swap a temp task for the confirmed server task, keeping any status the user
 *  set optimistically while the create was still in flight. */
function replaceTaskInCaches(qc: QueryClient, tempId: string, server: Task): void {
  forEachTaskCache(qc, (_key, tasks) => {
    if (!tasks.some((t) => t.id === tempId)) return undefined;
    return tasks.map((t) => (t.id === tempId ? { ...server, status: t.status } : t));
  });
}

function removeTaskFromCaches(qc: QueryClient, id: string): RemovedEntry[] {
  const removed: RemovedEntry[] = [];
  forEachTaskCache(qc, (key, tasks) => {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;
    removed.push({ key, task: tasks[index], index });
    return tasks.filter((t) => t.id !== id);
  });
  return removed;
}

function restoreRemoved(qc: QueryClient, removed: RemovedEntry[]): void {
  for (const { key, task, index } of removed) {
    qc.setQueryData<Task[]>(key, (old) => {
      if (!old || old.some((t) => t.id === task.id)) return old;
      const next = [...old];
      next.splice(Math.min(index, next.length), 0, task);
      return next;
    });
  }
}

function findCachedTask(qc: QueryClient, id: string): Task | undefined {
  for (const scope of TASK_SCOPES) {
    for (const [, data] of qc.getQueriesData<Task[]>({ queryKey: ['tasks', scope] })) {
      const hit = data?.find((t) => t.id === id);
      if (hit) return hit;
    }
  }
  return undefined;
}

/* ---------------- hook ---------------- */

interface UseRitualTasksParams {
  weekStart: string;
  weekEnd: string;
  /** Omit on pages without a month calendar — skips the month-range fetch. */
  monthStart?: string;
  monthEnd?: string;
}

export function useRitualTasks({ weekStart, weekEnd, monthStart, monthEnd }: UseRitualTasksParams) {
  const qc = useQueryClient();
  const { showToast } = useToast();

  const weekQuery = useQuery({
    queryKey: ['tasks', 'week', weekStart, weekEnd],
    queryFn: ({ signal }) => fetchTasksForRange(weekStart, weekEnd, signal),
    enabled: Boolean(weekStart && weekEnd),
    // Paging to another week keeps showing the previous data (with an inline
    // indicator) instead of unmounting to a spinner.
    placeholderData: keepPreviousData,
  });

  const monthEnabled = Boolean(monthStart && monthEnd);
  const monthQuery = useQuery({
    queryKey: ['tasks', 'month', monthStart, monthEnd],
    queryFn: ({ signal }) => fetchTasksForRange(monthStart!, monthEnd!, signal),
    enabled: monthEnabled,
    placeholderData: keepPreviousData,
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
    // Expand spans/recurrence across the union of both fetched ranges
    // (month range is optional on pages without a month calendar).
    const rangeStart = monthStart && monthStart < weekStart ? monthStart : weekStart;
    const rangeEnd = monthEnd && monthEnd > weekEnd ? monthEnd : weekEnd;
    return groupTasksByDate(merged, rangeStart, rangeEnd);
  }, [weekQuery.data, monthQuery.data, weekStart, weekEnd, monthStart, monthEnd]);

  function cancelTaskQueries(): void {
    // Abort in-flight fetches so a stale response can't overwrite optimistic state.
    for (const scope of TASK_SCOPES) void qc.cancelQueries({ queryKey: ['tasks', scope] });
  }

  function settleInvalidate(): void {
    // Reconcile with the server only when the burst of mutations is over —
    // invalidating mid-burst refetches and momentarily reverts optimistic state.
    if (qc.isMutating() > 1) return;
    for (const scope of TASK_SCOPES) void qc.invalidateQueries({ queryKey: ['tasks', scope] });
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) =>
      serialized(id, () => apiPut<Task>(`/tasks/${id}`, { status: done ? 'completed' : 'pending' })),
    onMutate: ({ id, done }): { prevStatus?: TaskStatus } => {
      cancelTaskQueries();
      const prevStatus = findCachedTask(qc, id)?.status;
      patchTaskInCaches(qc, id, { status: done ? 'completed' : 'pending' });
      return { prevStatus };
    },
    onError: (error, { id }, context) => {
      // Only roll back if no newer write for this task is still in flight.
      const othersInFlight =
        qc.isMutating({
          predicate: (m) => (m.state.variables as { id?: string } | undefined)?.id === id,
        }) > 1;
      if (context?.prevStatus && !othersInFlight) {
        patchTaskInCaches(qc, id, { status: context.prevStatus });
      }
      showToast(`Couldn't update task — ${getErrorMessage(error)}`, 'error');
    },
    onSettled: settleInvalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => serialized(id, () => apiDelete(`/tasks/${id}`)),
    onMutate: ({ id }): { removed: RemovedEntry[] } => {
      cancelTaskQueries();
      return { removed: removeTaskFromCaches(qc, id) };
    },
    onError: (error, _vars, context) => {
      if (context?.removed.length) restoreRemoved(qc, context.removed);
      showToast(`Couldn't delete task — ${getErrorMessage(error)}`, 'error');
    },
    onSettled: settleInvalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Task> }) =>
      serialized(id, () => apiPut<Task>(`/tasks/${id}`, patch)),
    onMutate: ({ id, patch }): { prev?: Task } => {
      cancelTaskQueries();
      const prev = findCachedTask(qc, id);
      patchTaskInCaches(qc, id, patch);
      return { prev };
    },
    onError: (error, { id }, context) => {
      const othersInFlight =
        qc.isMutating({
          predicate: (m) => (m.state.variables as { id?: string } | undefined)?.id === id,
        }) > 1;
      if (context?.prev && !othersInFlight) {
        patchTaskInCaches(qc, id, context.prev);
      }
      showToast(`Couldn't update task — ${getErrorMessage(error)}`, 'error');
    },
    onSettled: settleInvalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: ({ taskIds }: { taskIds: string[]; prevPositions: Map<string, number | null> }) =>
      apiPost('/tasks/reorder', { task_ids: taskIds }),
    onMutate: ({ taskIds }) => {
      cancelTaskQueries();
      taskIds.forEach((id, index) => patchTaskInCaches(qc, id, { position: index }));
    },
    onError: (error, { taskIds, prevPositions }) => {
      for (const id of taskIds) {
        patchTaskInCaches(qc, id, { position: prevPositions.get(id) ?? null });
      }
      showToast(`Couldn't reorder tasks — ${getErrorMessage(error)}`, 'error');
    },
    onSettled: settleInvalidate,
  });

  const createMutation = useMutation({
    mutationFn: ({ dateKey, title }: { tempId: string; dateKey: string; title: string }) =>
      apiPost<Task>('/tasks', { title, due_date: dateKey }),
    onMutate: ({ tempId, dateKey, title }) => {
      cancelTaskQueries();
      insertTaskIntoCaches(qc, optimisticTask(tempId, title, dateKey));
    },
    onSuccess: (serverTask, { tempId }) => {
      idMap.set(tempId, serverTask.id);
      replaceTaskInCaches(qc, tempId, serverTask);
      // Flush anything the user did to this task while it was still saving.
      const ops = pendingOps.get(tempId);
      pendingOps.delete(tempId);
      if (ops?.deleted) {
        deleteMutation.mutate({ id: serverTask.id });
        return;
      }
      if (ops?.desiredDone !== undefined) {
        toggleMutation.mutate({ id: serverTask.id, done: ops.desiredDone });
      }
    },
    onError: (error, { tempId, title }) => {
      removeTaskFromCaches(qc, tempId);
      pendingOps.delete(tempId);
      showToast(`Couldn't save "${title}" — ${getErrorMessage(error)}`, 'error');
    },
    onSettled: settleInvalidate,
  });

  /** Optimistic: inserts immediately and returns a temp id synchronously. */
  function addTask(dateKey: string, title: string): string {
    const tempId = newTempId();
    createMutation.mutate({ tempId, dateKey, title });
    return tempId;
  }

  function toggleTask(_dateKey: string, id: string) {
    const realId = idMap.get(id) ?? id;
    const current = findCachedTask(qc, realId);
    if (!current) return;
    const nextDone = current.status !== 'completed';
    if (isTempId(realId)) {
      // Still saving — update the cache now, sync once the real id arrives.
      cancelTaskQueries();
      patchTaskInCaches(qc, realId, { status: nextDone ? 'completed' : 'pending' });
      pendingOps.set(realId, { ...pendingOps.get(realId), desiredDone: nextDone });
      return;
    }
    toggleMutation.mutate({ id: realId, done: nextDone });
  }

  function updateTask(id: string, patch: Partial<Task>) {
    const realId = idMap.get(id) ?? id;
    if (isTempId(realId)) {
      // Still saving — just update the cache; the detail page can't be opened
      // for temp ids, so no server sync is queued for these edits.
      cancelTaskQueries();
      patchTaskInCaches(qc, realId, patch);
      return;
    }
    updateMutation.mutate({ id: realId, patch });
  }

  /** Persist a new manual order for one day's tasks. Temp ids are patched
   *  locally but excluded from the server payload (they re-sort on refetch);
   *  projected occurrences (ids with '::') are display-only and skipped. */
  function reorderTasks(orderedIds: string[]) {
    const resolved = orderedIds.filter((id) => !id.includes('::')).map((id) => idMap.get(id) ?? id);
    const prevPositions = new Map<string, number | null>();
    resolved.forEach((id, index) => {
      prevPositions.set(id, findCachedTask(qc, id)?.position ?? null);
      if (isTempId(id)) patchTaskInCaches(qc, id, { position: index });
    });
    const taskIds = resolved.filter((id) => !isTempId(id));
    if (taskIds.length === 0) return;
    reorderMutation.mutate({ taskIds, prevPositions });
  }

  function deleteTask(_dateKey: string, id: string) {
    const realId = idMap.get(id) ?? id;
    if (isTempId(realId)) {
      cancelTaskQueries();
      removeTaskFromCaches(qc, realId);
      pendingOps.set(realId, { ...pendingOps.get(realId), deleted: true });
      return;
    }
    deleteMutation.mutate({ id: realId });
  }

  return {
    tasksByDate,
    // True cold start only — cached or placeholder data renders instantly.
    isLoading: weekQuery.isPending && monthQuery.isPending,
    isWeekLoading: weekQuery.isFetching,
    isMonthLoading: monthQuery.isFetching,
    isError: weekQuery.isError || monthQuery.isError,
    refetch: () => {
      weekQuery.refetch();
      // refetch() ignores `enabled` — don't fire a fetch for a disabled month query
      if (monthEnabled) monthQuery.refetch();
    },
    addTask,
    toggleTask,
    deleteTask,
    updateTask,
    reorderTasks,
    getErrorMessage,
    isMutating: createMutation.isPending || toggleMutation.isPending || deleteMutation.isPending,
  };
}
