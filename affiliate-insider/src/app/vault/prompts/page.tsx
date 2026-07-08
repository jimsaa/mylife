'use client';

import { useEffect, useState, useMemo } from 'react';
import { PROMPT_CATEGORY_LABELS } from '@/lib/constants';
import type { Prompt, PromptCategory } from '@/types';
import { VaultCard, VaultFilterChip, VaultPageHeader } from '@/components/vault/vault-ui';
import { CopyButton } from '@/components/ui/copy-button';
import { FavoriteButton } from '@/components/ui/favorite-button';
import { SearchInput } from '@/components/ui/search-input';

export default function PromptLibraryPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PromptCategory | 'all'>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/content/prompts')
      .then((r) => r.json())
      .then((d) => setPrompts(d.items ?? []));
  }, []);

  const filtered = useMemo(() => {
    let items = [...prompts];
    if (category !== 'all') items = items.filter((p) => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return items;
  }, [prompts, search, category]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <VaultPageHeader
        title="Prompt Library"
        subtitle="Copy-ready AI prompts for every platform."
      />

      <SearchInput variant="vault" value={search} onChange={setSearch} placeholder="Search prompts..." />

      <div className="flex flex-wrap gap-2">
        <VaultFilterChip active={category === 'all'} onClick={() => setCategory('all')}>
          All
        </VaultFilterChip>
        {(Object.keys(PROMPT_CATEGORY_LABELS) as PromptCategory[]).map((cat) => (
          <VaultFilterChip
            key={cat}
            active={category === cat}
            onClick={() => setCategory(cat)}
          >
            {PROMPT_CATEGORY_LABELS[cat]}
          </VaultFilterChip>
        ))}
      </div>

      <div className="grid gap-4">
        {filtered.map((prompt) => (
          <VaultCard key={prompt.id} compact>
            <div className="flex items-start justify-between gap-4">
              <div>
                {prompt.featured && (
                  <span className="text-xs font-medium text-amber-400">★ Featured</span>
                )}
                <span className="ml-2 text-xs font-medium uppercase text-violet-400">
                  {PROMPT_CATEGORY_LABELS[prompt.category]}
                </span>
                <h3 className="mt-1 text-lg font-semibold text-white">{prompt.title}</h3>
                <p className="mt-1 text-sm text-zinc-500">{prompt.description}</p>
              </div>
              <FavoriteButton
                active={favorites.has(prompt.id)}
                onToggle={() => {
                  setFavorites((prev) => {
                    const next = new Set(prev);
                    if (next.has(prompt.id)) next.delete(prompt.id);
                    else next.add(prompt.id);
                    return next;
                  });
                }}
              />
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-sm text-zinc-300">
              {prompt.content}
            </pre>
            <div className="mt-4">
              <CopyButton variant="vault" text={prompt.content} />
            </div>
          </VaultCard>
        ))}
      </div>
    </div>
  );
}
