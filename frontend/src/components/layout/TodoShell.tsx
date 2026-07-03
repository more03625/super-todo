'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sun, Settings, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: 'My Day', icon: Sun },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function userInitials(name: string | null | undefined, email: string): string {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  return email[0]?.toUpperCase() ?? '?';
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-500 text-sm font-semibold text-white">
            {user ? userInitials(user.full_name, user.email) : '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user?.full_name || 'User'}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <Link href="/" onClick={onNavigate} className="mb-4 block px-3">
          <span className="bg-gradient-to-r from-navy-600 to-navy-400 bg-clip-text text-xl font-bold text-transparent">
            SuperToDo
          </span>
        </Link>
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn('nav-link', active && 'nav-link-active')}
            >
              <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-navy-500')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function TodoShell({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="todo-sidebar fixed inset-y-0 left-0 z-40 hidden w-[260px] lg:block">
        <SidebarNav />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="todo-sidebar absolute inset-y-0 left-0 w-[260px] shadow-xl">
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-muted hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-gray-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto">
            <button type="button" onClick={logout} className="btn-danger flex items-center gap-1.5">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
