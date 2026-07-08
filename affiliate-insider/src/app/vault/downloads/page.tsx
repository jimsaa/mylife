'use client';

import { useEffect, useState } from 'react';
import { FileText, Layout, ListChecks, Palette } from 'lucide-react';
import type { DownloadAsset, DownloadType } from '@/types';
import { VaultCard, VaultPageHeader } from '@/components/vault/vault-ui';

const TYPE_ICONS: Record<DownloadType, typeof FileText> = {
  pdf: FileText,
  template: Layout,
  checklist: ListChecks,
  notion: FileText,
  canva: Palette,
};

export default function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadAsset[]>([]);

  useEffect(() => {
    fetch('/api/content/downloads')
      .then((r) => r.json())
      .then((d) => setDownloads(d.items ?? []));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <VaultPageHeader title="Downloads" subtitle="PDFs, templates, checklists, and more." />

      <div className="grid gap-4 md:grid-cols-2">
        {downloads.map((asset) => {
          const Icon = TYPE_ICONS[asset.type];
          const href = asset.external_url ?? asset.file_url;
          return (
            <VaultCard key={asset.id} compact>
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-600/10 text-violet-300">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <span className="text-xs uppercase text-zinc-500">{asset.type}</span>
                  <h3 className="font-semibold text-white">{asset.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{asset.description}</p>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-sm font-medium text-violet-400 hover:text-violet-300"
                    >
                      Download →
                    </a>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-600">Coming soon</p>
                  )}
                </div>
              </div>
            </VaultCard>
          );
        })}
      </div>
    </div>
  );
}
