'use client';

import { CopyButton } from '@/components/ui/copy-button';
import { vaultPanelClass } from '@/components/vault/vault-ui';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AffiliateDashboardStats } from '@/types/affiliate';

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={cn(vaultPanelClass, 'p-5')}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AffiliateStatsGrid({ stats }: { stats: AffiliateDashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Clicks" value={String(stats.clicks)} />
      <StatCard label="Leads" value={String(stats.leads)} />
      <StatCard label="Sales" value={String(stats.sales)} />
      <StatCard
        label="Monthly Recurring"
        value={String(stats.monthly_recurring_customers)}
        hint="Active Monthly Build Pro referrals"
      />
      <StatCard label="Monthly Commission" value={formatUsd(stats.monthly_commission_cents)} />
      <StatCard label="Lifetime Commission" value={formatUsd(stats.lifetime_commission_cents)} />
      <StatCard label="Pending" value={formatUsd(stats.pending_commission_cents)} />
      <StatCard label="Approved" value={formatUsd(stats.approved_commission_cents)} />
      <StatCard label="Paid" value={formatUsd(stats.paid_commission_cents)} />
    </div>
  );
}

export function ReferralLinkCard({ url }: { url: string }) {
  return (
    <div className={cn(vaultPanelClass, 'p-6')}>
      <h2 className="font-semibold text-white">Your referral link</h2>
      <p className="mt-1 text-sm text-zinc-500">Share this link. Commissions track when visitors purchase.</p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="flex-1 truncate rounded-xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-sm text-zinc-300">
          {url}
        </code>
        <CopyButton variant="vault" text={url} label="Copy link" />
      </div>

      <div className="mt-6 flex items-center gap-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80">
          <QrCode className="h-10 w-10 text-zinc-600" />
        </div>
        <div>
          <p className="font-medium text-zinc-300">QR code</p>
          <p className="mt-1 text-sm text-zinc-500">
            Placeholder — downloadable QR will be generated when payouts go live.
          </p>
        </div>
      </div>
    </div>
  );
}
