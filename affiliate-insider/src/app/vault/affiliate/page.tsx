'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AffiliateNav } from '@/components/affiliate/affiliate-nav';
import { AffiliateResources } from '@/components/affiliate/affiliate-resources';
import { AffiliateStatsGrid, ReferralLinkCard } from '@/components/affiliate/affiliate-dashboard';
import { CommissionHistory } from '@/components/affiliate/commission-history';
import { AffiliateLeaderboard } from '@/components/affiliate/leaderboard';
import { MarketingKit } from '@/components/affiliate/marketing-kit';
import { PayoutBalanceCard } from '@/components/affiliate/payout-balance-card';
import { PayoutHistoryTable } from '@/components/affiliate/payout-history';
import { PayoutRulesCard } from '@/components/affiliate/payout-rules-card';
import { TopPerformingTools } from '@/components/affiliate/top-performing-tools';
import { VaultPageHeader } from '@/components/vault/vault-ui';
import type {
  AffiliateAsset,
  AffiliateAssetCategory,
  AffiliateCommission,
  AffiliateDashboardStats,
  AffiliateLeaderboardEntry,
  AffiliatePayout,
  AffiliatePayoutBalance,
  AffiliateProfile,
} from '@/types/affiliate';
import type { ToolClickStats } from '@/types/tool-clicks';

interface DashboardData {
  affiliate: AffiliateProfile;
  referral_url: string;
  stats: AffiliateDashboardStats;
  balance: AffiliatePayoutBalance;
  payouts: AffiliatePayout[];
  payout_rules: {
    minimum_payout_cents: number;
    payout_method: string;
    payout_schedule: string;
  };
  commissions: AffiliateCommission[];
  assets_by_category: Partial<Record<AffiliateAssetCategory, AffiliateAsset[]>>;
  asset_category_labels: Record<AffiliateAssetCategory, string>;
  leaderboard: AffiliateLeaderboardEntry[];
  top_tools: ToolClickStats[];
}

export default function AffiliateCenterPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/affiliate/dashboard')
      .then(async (r) => {
        if (r.status === 403) {
          router.replace('/vault');
          return null;
        }
        if (!r.ok) throw new Error('Failed to load');
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => setError('Could not load Affiliate Center.'));
  }, [router]);

  if (error) {
    return <p className="text-zinc-500">{error}</p>;
  }

  if (!data) {
    return <p className="text-zinc-500">Loading Affiliate Center...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <VaultPageHeader
        title="Affiliate Center"
        subtitle="Recommend Builder Pass and Monthly Build Pro. Earn when people you refer become customers."
      />

      <AffiliateNav />

      <PayoutBalanceCard balance={data.balance} />
      <PayoutRulesCard rules={data.payout_rules} />
      <AffiliateStatsGrid stats={data.stats} />
      <TopPerformingTools tools={data.top_tools} />
      <ReferralLinkCard url={data.referral_url} />
      <MarketingKit
        assetsByCategory={data.assets_by_category}
        categoryLabels={data.asset_category_labels}
        referralUrl={data.referral_url}
      />
      <AffiliateLeaderboard entries={data.leaderboard} />
      <CommissionHistory commissions={data.commissions} />
      <PayoutHistoryTable payouts={data.payouts} />
      <AffiliateResources minimumPayoutCents={data.payout_rules.minimum_payout_cents} />
    </div>
  );
}
