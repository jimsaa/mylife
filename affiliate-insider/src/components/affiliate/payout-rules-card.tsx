import { formatUsd } from '@/lib/affiliate/format';
import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';

export function PayoutRulesCard({
  rules,
}: {
  rules: {
    minimum_payout_cents: number;
    payout_method: string;
    payout_schedule: string;
  };
}) {
  return (
    <div className={cn(vaultPanelClass, 'p-6')}>
      <h2 className="font-semibold text-white">Payout rules</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Minimum payout
          </dt>
          <dd className="mt-1 text-lg font-semibold text-white">
            {formatUsd(rules.minimum_payout_cents)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Payout method
          </dt>
          <dd className="mt-1 text-lg font-semibold text-white">{rules.payout_method}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Payout schedule
          </dt>
          <dd className="mt-1 text-lg font-semibold text-white">{rules.payout_schedule}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-zinc-500">
        Payouts are processed manually. Add your PayPal details in Payout Settings.
      </p>
    </div>
  );
}
