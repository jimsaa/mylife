'use client';

import { useState } from 'react';
import { CopyButton } from '@/components/ui/copy-button';
import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';
import type { AffiliateAsset, AffiliateAssetCategory } from '@/types/affiliate';

export function MarketingKit({
  assetsByCategory,
  categoryLabels,
  referralUrl,
}: {
  assetsByCategory: Partial<Record<AffiliateAssetCategory, AffiliateAsset[]>>;
  categoryLabels: Record<AffiliateAssetCategory, string>;
  referralUrl: string;
}) {
  const categories = Object.keys(categoryLabels) as AffiliateAssetCategory[];
  const [active, setActive] = useState(categories[0]);

  const assets = assetsByCategory[active] ?? [];

  return (
    <div className={cn(vaultPanelClass, 'overflow-hidden p-0')}>
      <div className="border-b border-white/10 p-6">
        <h2 className="font-semibold text-white">Marketing kit</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Copy-ready assets. Replace [YOUR REFERRAL LINK] with your link before posting.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 p-4">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setActive(cat)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              active === cat
                ? 'border border-violet-500/30 bg-violet-600/20 text-violet-200'
                : 'border border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
            )}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-6">
        {assets.length === 0 ? (
          <p className="text-sm text-zinc-500">No assets in this category yet.</p>
        ) : (
          assets.map((asset) => {
            const text = asset.content.replace(/\[YOUR REFERRAL LINK\]/g, referralUrl);
            return (
              <div
                key={asset.id}
                className="rounded-xl border border-white/10 bg-zinc-950/50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm font-medium text-zinc-200">{asset.title}</p>
                  <CopyButton variant="vault" text={text} label="Copy" className="shrink-0" />
                </div>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-400">
                  {text}
                </pre>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
