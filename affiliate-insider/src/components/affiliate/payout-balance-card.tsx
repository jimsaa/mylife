import { formatUsd } from '@/lib/affiliate/format';
import { vaultCardFeaturedClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';
import type { AffiliatePayoutBalance } from '@/types/affiliate';

export function PayoutBalanceCard({ balance }: { balance: AffiliatePayoutBalance }) {
  return (
    <div className={cn(vaultCardFeaturedClass, 'p-6')}>
      <h2 className="text-sm font-medium uppercase tracking-wider text-violet-400">Payout balance</h2>

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-zinc-500">Current balance</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
            {formatUsd(balance.current_balance_cents)}
          </p>
          {balance.until_next_payout_cents > 0 ? (
            <p className="mt-1 text-sm text-zinc-500">
              {formatUsd(balance.until_next_payout_cents)} until next payout
            </p>
          ) : balance.eligible_for_payout ? (
            <p className="mt-1 text-sm font-medium text-emerald-400">Eligible for payout</p>
          ) : null}
        </div>
        <div>
          <p className="text-xs text-zinc-500">Pending</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-200">
            {formatUsd(balance.pending_cents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Approved</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-200">
            {formatUsd(balance.approved_cents)}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Paid</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-200">
            {formatUsd(balance.paid_cents)}
          </p>
        </div>
      </div>
    </div>
  );
}
