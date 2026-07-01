'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { Modal } from '@/components/ui/Modal';
import { apiPost, apiPut, apiDelete, getErrorMessage } from '@/services/api-client';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/contexts/ToastContext';
import type { Category, PaginatedResponse } from '@/types';

const ICONS = ['folder', 'briefcase', 'heart', 'book', 'star', 'zap'];
const COLORS = ['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#0ea5e9'];

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories?limit=50');
      return res.data.data as PaginatedResponse<Category>;
    },
  });

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { name: fd.get('name') as string, icon: fd.get('icon') as string, color: fd.get('color') as string, description: (fd.get('description') as string) || null };
    try {
      if (editing) await apiPut(`/categories/${editing.id}`, body);
      else await apiPost('/categories', body);
      qc.invalidateQueries({ queryKey: ['categories'] });
      setShowModal(false);
      showToast('Category saved', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <ProtectedLayout>
      <PageHeader title="Categories" subtitle="Organize tasks by type" action={
        <button type="button" className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="h-4 w-4" /> Add Category</button>
      } />
      {isError && <div className="mb-4 text-sm text-red-500">Failed to load. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
      {isLoading ? <SkeletonList count={4} /> : !data?.items.length ? (
        <EmptyState title="No categories" action={<button type="button" className="btn-primary" onClick={() => setShowModal(true)}>Add Category</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.items.map((cat) => (
            <div key={cat.id} className="card card-hover p-5" style={{ borderTop: `3px solid ${cat.color}` }}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="font-semibold text-foreground">{cat.name}</span>
              </div>
              {cat.description && <p className="mb-4 text-sm text-muted">{cat.description}</p>}
              <div className="flex gap-2">
                <button type="button" className="btn-secondary text-xs" onClick={() => { setEditing(cat); setShowModal(true); }}>Edit</button>
                <button type="button" className="btn-danger text-xs" onClick={async () => { await apiDelete(`/categories/${cat.id}`); qc.invalidateQueries({ queryKey: ['categories'] }); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'New'} Category`} footer={
        <><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" form="cat-form" className="btn-primary">Save</button></>
      }>
        <form id="cat-form" onSubmit={handleSave} className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium">Name</label><input name="name" className="input" required defaultValue={editing?.name} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Icon key</label><select name="icon" className="input" defaultValue={editing?.icon || 'folder'}>{ICONS.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
          <div><label className="mb-1.5 block text-sm font-medium">Color</label><select name="color" className="input" defaultValue={editing?.color || COLORS[0]}>{COLORS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          <div><label className="mb-1.5 block text-sm font-medium">Description</label><textarea name="description" className="input" defaultValue={editing?.description || ''} /></div>
        </form>
      </Modal>
    </ProtectedLayout>
  );
}
