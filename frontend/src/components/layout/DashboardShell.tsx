'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, CheckSquare, Tags, PieChart, BarChart3, Trophy, Flame, Settings, Menu, X, Sun, Moon, LogOut,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/categories', label: 'Categories', icon: Tags },
  { href: '/life-areas', label: 'Life Areas', icon: PieChart },
  { href: '/reports/weekly', label: 'Reports', icon: BarChart3 },
  { href: '/achievements', label: 'Achievements', icon: Trophy },
  { href: '/streaks', label: 'Streaks', icon: Flame },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1 px-3 py-4">
      <Link href="/dashboard" onClick={onNavigate} className="mb-6 block px-3">
        <span className="bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-xl font-bold text-transparent">
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
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-elevated">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-border bg-surface lg:block">
        <SidebarNav />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-surface shadow-xl">
            <div className="flex justify-end p-3">
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted hover:bg-surface-elevated">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-md sm:px-6">
          <button type="button" className="rounded-lg p-2 text-muted hover:bg-surface-elevated lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={toggleTheme} className="btn-secondary !px-2.5 !py-2" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            <span className="hidden text-sm text-muted md:inline">{user?.email}</span>
            <button type="button" onClick={logout} className="btn-danger flex items-center gap-1.5">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
