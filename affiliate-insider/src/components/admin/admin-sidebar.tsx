'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Download,
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  Share2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ADMIN_RESOURCES } from '@/lib/admin/collections';
import { cn } from '@/lib/utils';

const ICONS: Record<string, typeof Sparkles> = {
  prompts: Sparkles,
  hooks: Zap,
  ai_tools: Bot,
  affiliate_programs: Handshake,
  downloads: Download,
  vault_updates: Package,
  monthly_drops: Package,
};

export function AdminSidebar() {
  const pathname = usePathname();

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <aside className="flex h-full w-56 flex-col border-r border-zinc-200 bg-zinc-50">
      <div className="border-b border-zinc-200 p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Admin</p>
        <p className="font-semibold text-zinc-900">Affiliate Insider</p>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        <Link
          href="/admin"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            pathname === '/admin' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/80'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/admin/affiliates/payouts"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            pathname.startsWith('/admin/affiliates/payouts')
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-600 hover:bg-white/80'
          )}
        >
          <Share2 className="h-4 w-4" />
          Payouts
        </Link>
        <Link
          href="/admin/affiliates"
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            pathname === '/admin/affiliates'
              ? 'bg-white text-zinc-900 shadow-sm'
              : 'text-zinc-600 hover:bg-white/80'
          )}
        >
          <Share2 className="h-4 w-4" />
          Affiliates
        </Link>
        {ADMIN_RESOURCES.map((r) => {
          const Icon = ICONS[r.key] ?? Package;
          return (
            <Link
              key={r.key}
              href={r.href}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                pathname === r.href ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600 hover:bg-white/80'
              )}
            >
              <Icon className="h-4 w-4" />
              {r.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-200 p-3">
        <Link href="/vault" className="mb-2 block text-sm text-violet-600 hover:underline">
          View Vault →
        </Link>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-800"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
