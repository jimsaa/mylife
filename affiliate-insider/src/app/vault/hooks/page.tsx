'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Hook } from '@/types';
import { VaultCard, VaultFilterChip, VaultPageHeader } from '@/components/vault/vault-ui';
import { CopyButton } from '@/components/ui/copy-button';
import { SearchInput } from '@/components/ui/search-input';

const PLATFORMS = ['all', 'TikTok', 'Instagram', 'Facebook', 'YouTube', 'Email'];

export default function HookVaultPage() {
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('all');

  useEffect(() => {
    fetch('/api/content/hooks')
      .then((r) => r.json())
      .then((d) => setHooks(d.items ?? []));
  }, []);

  const filtered = useMemo(() => {
    let items = [...hooks];
    if (platform !== 'all') items = items.filter((h) => h.platform === platform);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((h) => h.text.toLowerCase().includes(q));
    }
    return items;
  }, [hooks, search, platform]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <VaultPageHeader title="Hook Vault" subtitle={`${hooks.length}+ scroll-stopping hooks.`} />

      <SearchInput variant="vault" value={search} onChange={setSearch} placeholder="Search hooks..." />

      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map((p) => (
          <VaultFilterChip key={p} active={platform === p} onClick={() => setPlatform(p)}>
            {p === 'all' ? 'All' : p}
          </VaultFilterChip>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((hook) => (
          <VaultCard key={hook.id} compact className="flex flex-col justify-between">
            <div>
              <span className="text-xs text-zinc-500">
                {hook.platform} · {hook.category}
              </span>
              <p className="mt-2 font-medium text-zinc-200">{hook.text}</p>
            </div>
            <div className="mt-4">
              <CopyButton variant="vault" text={hook.text} />
            </div>
          </VaultCard>
        ))}
      </div>
    </div>
  );
}
