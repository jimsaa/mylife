'use client';

import { useEffect, useState } from 'react';
import type { WhatsNewItem } from '@/types';
import { VaultCard } from '@/components/vault/vault-ui';

const TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  hook: 'Hook',
  ai_tool: 'AI Tool',
  affiliate_program: 'Program',
  download: 'Download',
  monthly_drop: 'Monthly Drop',
  vault_update: 'Update',
};

export function WhatsNew() {
  const [items, setItems] = useState<WhatsNewItem[]>([]);

  useEffect(() => {
    fetch('/api/whats-new')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []));
  }, []);

  if (!items.length) return null;

  return (
    <VaultCard compact>
      <h2 className="font-semibold text-white">What&apos;s New</h2>
      <ul className="mt-4 space-y-3">
        {items.slice(0, 8).map((item) => (
          <li key={item.id} className="flex gap-3 text-sm">
            <span className="shrink-0 rounded border border-violet-500/20 bg-violet-600/10 px-2 py-0.5 text-xs font-medium text-violet-300">
              {TYPE_LABELS[item.resource_type] ?? item.resource_type}
            </span>
            <div>
              <p className="font-medium text-zinc-200">{item.title}</p>
              <p className="text-zinc-500">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </VaultCard>
  );
}
