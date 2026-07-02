'use client';

import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <ProtectedLayout>
      <div className="p-4 sm:p-6">
        <PageHeader title="Settings" subtitle="Manage your account" />
        <div className="card max-w-lg p-5">
          <h5 className="mb-4 font-semibold">Profile</h5>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Email</dt>
              <dd className="font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Name</dt>
              <dd className="font-medium">{user?.full_name || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Role</dt>
              <dd className="font-medium capitalize">{user?.role}</dd>
            </div>
          </dl>
        </div>
      </div>
    </ProtectedLayout>
  );
}
