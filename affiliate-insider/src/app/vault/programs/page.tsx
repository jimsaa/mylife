'use client';

import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AffiliateProgram } from '@/types';
import { VaultCard, VaultPageHeader } from '@/components/vault/vault-ui';
import { SearchInput } from '@/components/ui/search-input';

export default function AffiliateProgramsPage() {
  const [programs, setPrograms] = useState<AffiliateProgram[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/content/affiliate_programs')
      .then((r) => r.json())
      .then((d) => setPrograms(d.items ?? []));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return programs;
    const q = search.toLowerCase();
    return programs.filter((p) => p.name.toLowerCase().includes(q));
  }, [programs, search]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <VaultPageHeader
        title="Affiliate Program Directory"
        subtitle="Programs worth applying to."
      />

      <SearchInput variant="vault" value={search} onChange={setSearch} placeholder="Search programs..." />

      <div className="space-y-4">
        {filtered.map((program) => (
          <VaultCard key={program.id} compact>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                {program.featured && (
                  <span className="text-xs font-medium text-amber-400">★ Featured</span>
                )}
                <span className="ml-2 text-xs font-medium uppercase text-violet-400">
                  {program.category}
                </span>
                <h3 className="mt-1 text-xl font-semibold text-white">{program.name}</h3>
                {program.notes && (
                  <p className="mt-2 text-sm text-zinc-500">{program.notes}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href={program.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
                >
                  Website <ExternalLink className="h-4 w-4" />
                </a>
                <a
                  href={program.affiliate_url ?? program.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
                >
                  {program.button_text || 'Apply'} <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-zinc-500">Commission</dt>
                <dd className="font-medium text-zinc-200">{program.commission}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Cookie</dt>
                <dd className="font-medium text-zinc-200">{program.cookie_duration}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Payout</dt>
                <dd className="font-medium text-zinc-200">{program.payout}</dd>
              </div>
            </dl>
          </VaultCard>
        ))}
      </div>
    </div>
  );
}
