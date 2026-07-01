'use client';

import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <ProtectedLayout>
      <PageHeader title="Settings" subtitle="Manage your account and preferences" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h5 className="mb-4 font-semibold">Profile</h5>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Email</dt><dd className="font-medium">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Name</dt><dd className="font-medium">{user?.full_name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Role</dt><dd className="font-medium capitalize">{user?.role}</dd></div>
          </dl>
        </div>
        <div className="card p-5">
          <h5 className="mb-4 font-semibold">Appearance</h5>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Theme</span>
            <button type="button" className="btn-secondary" onClick={toggleTheme}>
              {theme === 'light' ? <><Moon className="h-4 w-4" /> Dark mode</> : <><Sun className="h-4 w-4" /> Light mode</>}
            </button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
}
