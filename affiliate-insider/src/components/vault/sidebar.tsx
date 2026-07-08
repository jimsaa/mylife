'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bot,
  Download,
  Handshake,
  LayoutDashboard,
  LogOut,
  Rocket,
  Share2,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { VAULT_NAV } from '@/lib/constants';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  LayoutDashboard,
  Rocket,
  Sparkles,
  Zap,
  Bot,
  Handshake,
  Download,
  Share2,
  User,
} as const;

export function VaultSidebar({ adminLink }: { adminLink?: boolean }) {
  const pathname = usePathname();
  const [affiliateAccess, setAffiliateAccess] = useState(false);

  useEffect(() => {
    fetch('/api/affiliate/access')
      .then((r) => r.json())
      .then((d) => setAffiliateAccess(!!d.affiliate_center_access));
  }, []);

  const navItems = VAULT_NAV.filter(
    (item) => !('affiliateOnly' in item && item.affiliateOnly) || affiliateAccess
  );

  return (
    <aside className="relative z-10 flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-zinc-950/80 backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <Link href="/vault" className="text-lg font-semibold text-white">
          Affiliate Insider
        </Link>
        <p className="mt-1 text-xs font-medium text-violet-400">Builder Pass</p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                active
                  ? 'border border-violet-500/30 bg-violet-600/15 text-white'
                  : 'border border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        {adminLink && (
          <a href="/admin" className="block text-sm text-violet-400 hover:text-violet-300">
            Admin panel →
          </a>
        )}
        <button
          type="button"
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/login';
          }}
          className="mt-2 flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
