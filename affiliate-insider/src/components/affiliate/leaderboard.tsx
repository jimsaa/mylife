import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';
import type { AffiliateLeaderboardEntry } from '@/types/affiliate';

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AffiliateLeaderboard({ entries }: { entries: AffiliateLeaderboardEntry[] }) {
  return (
    <div className={cn(vaultPanelClass, 'overflow-hidden p-0')}>
      <div className="border-b border-white/10 p-6">
        <h2 className="font-semibold text-white">Leaderboard</h2>
        <p className="mt-1 text-sm text-zinc-500">Top affiliates — placeholder data until live database.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-3 font-medium">Rank</th>
              <th className="px-6 py-3 font-medium">Affiliate</th>
              <th className="px-6 py-3 font-medium">Sales</th>
              <th className="px-6 py-3 font-medium">Monthly</th>
              <th className="px-6 py-3 font-medium">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.affiliate_id} className="border-b border-white/5 last:border-0">
                <td className="px-6 py-4 font-medium text-white">#{e.rank}</td>
                <td className="px-6 py-4 text-zinc-300">
                  {e.display_name}
                  {e.is_placeholder && (
                    <span className="ml-2 text-xs text-zinc-600">(demo)</span>
                  )}
                </td>
                <td className="px-6 py-4 tabular-nums text-zinc-400">{e.sales}</td>
                <td className="px-6 py-4 tabular-nums text-zinc-400">{e.monthly_sales}</td>
                <td className="px-6 py-4 tabular-nums text-zinc-400">
                  {formatUsd(e.lifetime_sales_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
