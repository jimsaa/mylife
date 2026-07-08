import { ExternalLink } from 'lucide-react';
import type { AiTool } from '@/types';
import { AI_TOOL_DIFFICULTY_LABELS } from '@/lib/ai-tools/constants';
import { VaultCard } from '@/components/vault/vault-ui';
import { FavoriteButton } from '@/components/ui/favorite-button';
import { cn } from '@/lib/utils';

export function AiToolCard({
  tool,
  favorite,
  onToggleFavorite,
}: {
  tool: AiTool;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  const primaryHref = tool.go_url ?? `/go/tool/${tool.slug}`;
  const secondaryHref = tool.go_website_url ?? `${primaryHref}?to=website`;

  return (
    <VaultCard
      compact
      className={cn(
        tool.recommendation_status === 'recommended' && 'border-violet-500/30'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {tool.is_top_tool && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                Top Tool
              </span>
            )}
            {tool.badge && (
              <span className="text-xs font-medium text-violet-300">{tool.badge}</span>
            )}
            {tool.featured && !tool.badge && (
              <span className="text-xs font-medium text-amber-400">★ Featured</span>
            )}
            {tool.recommendation_status === 'recommended' && (
              <span className="rounded-full border border-violet-500/20 bg-violet-600/10 px-2 py-0.5 text-xs font-medium text-violet-300">
                Recommended
              </span>
            )}
          </div>
          <h3 className="mt-1 text-lg font-semibold text-white">{tool.name}</h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{tool.description}</p>
        </div>
        <FavoriteButton active={favorite} onToggle={onToggleFavorite} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tool.difficulty && (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
            {AI_TOOL_DIFFICULTY_LABELS[tool.difficulty]}
          </span>
        )}
        {tool.free_trial && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
            Free trial
          </span>
        )}
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
          {tool.pricing}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-zinc-400">
          {tool.click_count ?? 0} clicks
        </span>
        <span className="rounded-full border border-white/5 bg-white/[0.02] px-2.5 py-0.5 text-xs text-zinc-600">
          CTR: —
        </span>
      </div>

      {tool.recommendation_reasons.length > 0 && (
        <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-950/30 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
            Why we recommend it
          </p>
          <ul className="mt-2 space-y-1">
            {tool.recommendation_reasons.map((reason) => (
              <li key={reason} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={primaryHref}
          className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          {tool.button_text} <ExternalLink className="h-3 w-3" />
        </a>
        {tool.secondary_button_label && (
          <a
            href={secondaryHref}
            className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-white/20 hover:text-white"
          >
            {tool.secondary_button_label} <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </VaultCard>
  );
}
