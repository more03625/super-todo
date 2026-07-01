'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/SkeletonCard';
import { PieChartWrapper } from '@/components/charts/Charts';
import { Modal } from '@/components/ui/Modal';
import { apiPost, apiPut, apiDelete, getErrorMessage } from '@/services/api-client';
import { apiClient } from '@/services/api-client';
import { useToast } from '@/contexts/ToastContext';
import type { LifeArea, PaginatedResponse } from '@/types';

export default function LifeAreasPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<LifeArea | null>(null);
  const { showToast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['life-areas'],
    queryFn: async () => {
      const res = await apiClient.get('/life-areas?limit=50');
      return res.data.data as PaginatedResponse<LifeArea>;
    },
  });

  const items = data?.items || [];

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = { name: fd.get('name') as string, icon: fd.get('icon') as string, color: fd.get('color') as string };
    try {
      if (editing) await apiPut(`/life-areas/${editing.id}`, body);
      else await apiPost('/life-areas', body);
      qc.invalidateQueries({ queryKey: ['life-areas'] });
      setShowModal(false);
      showToast('Life area saved', 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <ProtectedLayout>
      <PageHeader title="Life Areas" subtitle="Balance across life domains" action={
        <button type="button" className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}><Plus className="h-4 w-4" /> Add Area</button>
      } />
      {isError && <div className="mb-4 text-sm text-red-500">Failed to load. <button type="button" className="underline" onClick={() => refetch()}>Retry</button></div>}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-1">
          <h5 className="mb-4 font-semibold">Balance Overview</h5>
          {items.length > 0 ? <PieChartWrapper labels={items.map(i => i.name)} data={items.map(() => 1)} colors={items.map(i => i.color)} /> : <EmptyState title="No areas yet" />}
        </div>
        <div className="lg:col-span-2">
          {isLoading ? <SkeletonList count={4} /> : items.length === 0 ? (
            <EmptyState title="No life areas" action={<button type="button" className="btn-primary" onClick={() => setShowModal(true)}>Add Area</button>} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((area) => (
                <div key={area.id} className="card p-5" style={{ borderLeft: `4px solid ${area.color}` }}>
                  <span className="font-semibold text-foreground">{area.name}</span>
                  <div className="mt-3 flex gap-2">
                    <button type="button" className="btn-secondary text-xs" onClick={() => { setEditing(area); setShowModal(true); }}>Edit</button>
                    <button type="button" className="btn-danger text-xs" onClick={async () => { await apiDelete(`/life-areas/${area.id}`); qc.invalidateQueries({ queryKey: ['life-areas'] }); }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title={`${editing ? 'Edit' : 'New'} Life Area`} footer={
        <><button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" form="la-form" className="btn-primary">Save</button></>
      }>
        <form id="la-form" onSubmit={handleSave} className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium">Name</label><input name="name" className="input" required defaultValue={editing?.name} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Icon</label><input name="icon" className="input" defaultValue={editing?.icon || 'star'} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Color</label><input name="color" type="color" className="input h-10" defaultValue={editing?.color || '#10b981'} /></div>
        </form>
      </Modal>
    </ProtectedLayout>
  );
}
