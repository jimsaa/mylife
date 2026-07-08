'use client';

import type { MonthlyDrop } from '@/types';
import { VaultCard } from '@/components/vault/vault-ui';

export function MonthlyDropCard({ drop }: { drop: MonthlyDrop }) {
  return (
    <VaultCard featured>
      <p className="text-xs font-medium uppercase tracking-wider text-violet-400">Monthly Drop</p>
      <h3 className="mt-1 text-xl font-semibold text-white">{drop.title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{drop.description}</p>
      <ul className="mt-4 space-y-1">
        {drop.items_included.map((item) => (
          <li key={item} className="text-sm font-medium text-zinc-300">
            {item}
          </li>
        ))}
      </ul>
    </VaultCard>
  );
}
