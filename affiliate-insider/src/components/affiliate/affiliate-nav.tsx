'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/vault/affiliate', label: 'Dashboard' },
  { href: '/vault/affiliate/settings', label: 'Payout Settings' },
];

export function AffiliateNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-white/10">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            'border-b-2 px-4 py-2.5 text-sm font-medium transition',
            pathname === tab.href
              ? 'border-violet-500 text-violet-300'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
