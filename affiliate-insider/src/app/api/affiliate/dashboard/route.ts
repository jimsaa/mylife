import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import {
  canUserAccessAffiliateCenter,
  computeDashboardStats,
  computePayoutBalance,
  getAssetsByCategory,
  getCommissionsForAffiliate,
  getLeaderboard,
  getOrEnrollAffiliate,
  getPayoutsForAffiliate,
  getPayoutSettings,
  getProgramConfig,
  getReferralLinkForUser,
} from '@/lib/repositories/affiliate-repository';
import { getTopTools } from '@/lib/repositories/tool-click-repository';
import { AFFILIATE_PRODUCTS, ASSET_CATEGORY_LABELS } from '@/lib/affiliate/constants';
import { payoutMethodLabel } from '@/lib/affiliate/format';

export async function GET() {
  const user = await getServerSession();
  if (!user || !canUserAccessAffiliateCenter(user)) {
    return NextResponse.json({ error: 'Affiliate Center requires a paid Builder Pass account.' }, { status: 403 });
  }

  const affiliate = getOrEnrollAffiliate(user);
  if (affiliate.status === 'disabled') {
    return NextResponse.json({ error: 'Your affiliate account has been disabled.' }, { status: 403 });
  }

  const stats = computeDashboardStats(affiliate.id);
  const balance = computePayoutBalance(affiliate.id);
  const commissions = getCommissionsForAffiliate(affiliate.id);
  const payouts = getPayoutsForAffiliate(affiliate.id);
  const payoutSettings = getPayoutSettings(affiliate.id);
  const programConfig = getProgramConfig();
  const assetsByCategory = getAssetsByCategory();
  const leaderboard = getLeaderboard();

  return NextResponse.json({
    affiliate,
    referral_url: getReferralLinkForUser(user),
    stats,
    balance,
    payouts,
    payout_settings: payoutSettings,
    payout_rules: {
      minimum_payout_cents: programConfig.minimum_payout_cents,
      payout_method: payoutMethodLabel(programConfig.payout_method),
      payout_schedule: programConfig.payout_schedule,
    },
    commissions,
    assets_by_category: assetsByCategory,
    asset_category_labels: ASSET_CATEGORY_LABELS,
    products: AFFILIATE_PRODUCTS,
    leaderboard,
    top_tools: getTopTools(5),
  });
}
