import { AFFILIATE_PRODUCTS, PARTNER_LEVELS, PAYOUT_METHOD_LABEL, PAYOUT_SCHEDULE } from '@/lib/affiliate/constants';
import { formatUsd } from '@/lib/affiliate/format';
import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';

export function AffiliateResources({ minimumPayoutCents }: { minimumPayoutCents?: number }) {
  return (
    <div className={cn(vaultPanelClass, 'p-6')}>
      <h2 className="font-semibold text-white">How the program works</h2>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Commission rates
          </h3>
          <ul className="mt-3 space-y-3">
            {Object.values(AFFILIATE_PRODUCTS).map((p) => (
              <li
                key={p.name}
                className="rounded-xl border border-white/10 bg-zinc-950/50 p-4"
              >
                <p className="font-medium text-white">{p.name}</p>
                <p className="mt-1 text-sm text-zinc-400">{p.description}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-zinc-500">
            Recurring commissions continue while the referred member stays active on Monthly Build Pro.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Payouts</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-400">
            <li>Method: {PAYOUT_METHOD_LABEL}</li>
            <li>Schedule: {PAYOUT_SCHEDULE}</li>
            <li>
              Minimum payout:{' '}
              {minimumPayoutCents != null ? formatUsd(minimumPayoutCents) : '$25.00'}
            </li>
            <li>Processed manually via PayPal each month</li>
          </ul>

          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Best practices
          </h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">
            <li>Only recommend products you genuinely use.</li>
            <li>Never spam — share when it&apos;s relevant and helpful.</li>
            <li>Be honest about what Builder Pass is (and isn&apos;t).</li>
            <li>Disclose affiliate relationships where required by law.</li>
          </ul>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-dashed border-violet-500/20 bg-violet-950/30 p-4">
        <p className="text-sm font-medium text-violet-300">Coming soon: Partner levels</p>
        <ul className="mt-2 flex flex-wrap gap-3">
          {Object.values(PARTNER_LEVELS)
            .filter((l) => l.future)
            .map((l) => (
              <li
                key={l.label}
                className="rounded-full border border-violet-500/20 bg-violet-600/10 px-3 py-1 text-xs text-violet-300"
              >
                {l.label}
              </li>
            ))}
        </ul>
        <p className="mt-2 text-xs text-violet-400/80">
          Architecture ready for coupon codes, launch contests, and bonus commissions.
        </p>
      </div>
    </div>
  );
}
