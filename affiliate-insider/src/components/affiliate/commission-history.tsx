import { AFFILIATE_PRODUCTS } from '@/lib/affiliate/constants';
import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';
import type { AffiliateCommission } from '@/types/affiliate';

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-300',
  approved: 'bg-blue-500/10 text-blue-300',
  paid: 'bg-emerald-500/10 text-emerald-300',
  reversed: 'bg-zinc-500/10 text-zinc-400',
} as const;

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function CommissionHistory({ commissions }: { commissions: AffiliateCommission[] }) {
  return (
    <div className={cn(vaultPanelClass, 'overflow-hidden p-0')}>
      <div className="border-b border-white/10 p-6">
        <h2 className="font-semibold text-white">Commission history</h2>
        <p className="mt-1 text-sm text-zinc-500">Pending → Approved → Paid (payouts not live yet).</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Customer</th>
              <th className="px-6 py-3 font-medium">Product</th>
              <th className="px-6 py-3 font-medium">Commission</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {commissions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                  No commissions yet. Share your link to get started.
                </td>
              </tr>
            ) : (
              commissions.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-6 py-4 text-zinc-400">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-zinc-300">{c.customer_label}</td>
                  <td className="px-6 py-4 text-zinc-400">
                    {AFFILIATE_PRODUCTS[c.product].name}
                    {c.is_recurring && (
                      <span className="ml-1 text-xs text-violet-400">recurring</span>
                    )}
                  </td>
                  <td className="px-6 py-4 tabular-nums font-medium text-white">
                    {formatUsd(c.amount_cents)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[c.status]}`}
                    >
                      {c.status}
                    </span>
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
