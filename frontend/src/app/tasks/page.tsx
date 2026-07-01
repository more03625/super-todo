'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { Modal } from '@/components/ui/Modal';
import { apiPost, apiPut, apiDelete, getErrorMessage } from '@/services/api-client';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/contexts/ToastContext';
import type { PaginatedResponse, Task, TaskPriority, TaskStatus } from '@/types';
import { cn } from '@/lib/utils';

const PRIORITY_BORDER: Record<TaskPriority, string> = {
  low: 'border-l-gray-400',
  medium: 'border-l-brand-500',
  high: 'border-l-amber-500',
  urgent: 'border-l-red-500',
};

export default function TasksPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filter, setFilter] = useState<TaskStatus | ''>('');
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '50' });
      if (filter) params.set('status', filter);
      const res = await apiClient.get(`/tasks?${params}`);
      return res.data.data as PaginatedResponse<Task>;
    },
  });

  const toggleComplete = useMutation({
    mutationFn: (task: Task) => apiPut<Task>(`/tasks/${task.id}`, { status: task.status === 'completed' ? 'pending' : 'completed' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); showToast('Task updated', 'success'); },
    onError: (e) => showToast(getErrorMessage(e), 'error'),
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => apiDelete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); showToast('Task deleted', 'success'); },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { title: fd.get('title') as string, description: (fd.get('description') as string) || null, priority: fd.get('priority') as TaskPriority };
    try {
      if (editing) await apiPut(`/tasks/${editing.id}`, body);
      else await apiPost('/tasks', body);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setShowModal(false);
      setEditing(null);
      showToast(editing ? 'Task updated' : 'Task created', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <ProtectedLayout>
      <PageHeader title="Tasks" subtitle="Manage your daily work" action={
        <button type="button" className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus className="h-4 w-4" /> New Task
        </button>
      } />

      <select className="input mb-4 w-auto" value={filter} onChange={(e) => setFilter(e.target.value as TaskStatus | '')}>
        <option value="">All statuses</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>

      {isError && <div className="mb-4 text-sm text-red-500">Failed to load. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
      {isLoading ? <SkeletonList count={5} /> : !data?.items.length ? (
        <EmptyState title="No tasks yet" description="Create your first task" action={<button type="button" className="btn-primary" onClick={() => setShowModal(true)}>Create Task</button>} />
      ) : (
        <div className="space-y-2">
          {data.items.map((task) => (
            <div key={task.id} className={cn('card flex items-center gap-3 border-l-4 p-4', PRIORITY_BORDER[task.priority], task.status === 'completed' && 'opacity-60')}>
              <input type="checkbox" className="h-4 w-4 rounded border-border accent-brand-500" checked={task.status === 'completed'} onChange={() => toggleComplete.mutate(task)} />
              <div className="min-w-0 flex-1">
                <div className={cn('font-medium', task.status === 'completed' && 'line-through')}>{task.title}</div>
                {task.description && <p className="text-sm text-muted">{task.description}</p>}
              </div>
              <PriorityBadge priority={task.priority} />
              <button type="button" className="btn-secondary !p-2" onClick={() => { setEditing(task); setShowModal(true); }}><Pencil className="h-4 w-4" /></button>
              <button type="button" className="btn-danger !p-2" onClick={() => deleteTask.mutate(task.id)}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Task' : 'New Task'} footer={
        <>
          <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button type="submit" form="task-form" className="btn-primary">Save</button>
        </>
      }>
        <form id="task-form" onSubmit={handleSave} className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium">Title</label><input name="title" className="input" required defaultValue={editing?.title} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Description</label><textarea name="description" className="input min-h-[80px]" rows={3} defaultValue={editing?.description || ''} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Priority</label>
            <select name="priority" className="input" defaultValue={editing?.priority || 'medium'}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
            </select>
          </div>
        </form>
      </Modal>
    </ProtectedLayout>
  );
}
