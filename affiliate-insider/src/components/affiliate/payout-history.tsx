import { formatUsd, payoutMethodLabel } from '@/lib/affiliate/format';
import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';
import type { AffiliatePayout } from '@/types/affiliate';

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-300',
  processing: 'bg-blue-500/10 text-blue-300',
  paid: 'bg-emerald-500/10 text-emerald-300',
  failed: 'bg-red-500/10 text-red-300',
} as const;

export function PayoutHistoryTable({ payouts }: { payouts: AffiliatePayout[] }) {
  return (
    <div className={cn(vaultPanelClass, 'overflow-hidden p-0')}>
      <div className="border-b border-white/10 p-6">
        <h2 className="font-semibold text-white">Payout history</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Method</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Reference</th>
            </tr>
          </thead>
          <tbody>
            {payouts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No payouts yet. Earn approved commissions to qualify.
                </td>
              </tr>
            ) : (
              payouts.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0">
                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(p.paid_at ?? p.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium tabular-nums text-white">
                    {formatUsd(p.amount_cents)}
                  </td>
                  <td className="px-6 py-4 text-zinc-400">
                    {payoutMethodLabel(p.payment_method)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                    {p.reference ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
