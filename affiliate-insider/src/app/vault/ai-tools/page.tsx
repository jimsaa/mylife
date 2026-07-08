'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AiTool } from '@/types';
import { AI_TOOL_CATEGORIES, AI_TOOL_CATEGORY_LABELS } from '@/lib/ai-tools/constants';
import { AiToolCard } from '@/components/vault/ai-tool-card';
import { VaultFilterChip, VaultPageHeader } from '@/components/vault/vault-ui';
import { SearchInput } from '@/components/ui/search-input';

export default function AiToolsPage() {
  const [tools, setTools] = useState<AiTool[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/content/ai_tools')
      .then((r) => r.json())
      .then((d) => setTools(d.items ?? []));
  }, []);

  const filtered = useMemo(() => {
    let items = [...tools];
    if (category !== 'all') items = items.filter((t) => t.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => b.priority - a.priority);
  }, [tools, search, category]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <VaultPageHeader
        title="AI Tool Stack"
        subtitle="Curated tools for building digital income projects with AI."
      />

      <SearchInput variant="vault" value={search} onChange={setSearch} placeholder="Search tools..." />

      <div className="flex flex-wrap gap-2">
        {(['all', ...AI_TOOL_CATEGORIES] as const).map((c) => (
          <VaultFilterChip key={c} active={category === c} onClick={() => setCategory(c)}>
            {AI_TOOL_CATEGORY_LABELS[c]}
          </VaultFilterChip>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((tool) => (
          <AiToolCard
            key={tool.id}
            tool={tool}
            favorite={favorites.has(tool.id)}
            onToggleFavorite={() => {
              setFavorites((prev) => {
                const next = new Set(prev);
                if (next.has(tool.id)) next.delete(tool.id);
                else next.add(tool.id);
                return next;
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
