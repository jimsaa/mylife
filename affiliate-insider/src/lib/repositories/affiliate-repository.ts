import { hasAffiliateCenterAccess } from '@/lib/affiliate/access';
import { buildReferralUrl } from '@/lib/affiliate/referral';
import { generateId, readDatabase, updateDatabase } from '@/lib/data/store';
import type { UserProfile } from '@/types';
import { PAYOUT_MINIMUM_CENTS } from '@/lib/affiliate/constants';
import type {
  AffiliateAdminStats,
  AffiliateAsset,
  AffiliateAssetCategory,
  AffiliateCommission,
  AffiliateDashboardStats,
  AffiliateLeaderboardEntry,
  AffiliatePayout,
  AffiliatePayoutAdminRow,
  AffiliatePayoutBalance,
  AffiliatePayoutSettings,
  AffiliateProfile,
  AffiliateProgramConfig,
  AffiliateStatus,
} from '@/types/affiliate';

function now() {
  return new Date().toISOString();
}

export function getPurchases() {
  return readDatabase().purchases;
}

export function canUserAccessAffiliateCenter(user: UserProfile | null): boolean {
  if (!user) return false;
  return hasAffiliateCenterAccess(user, readDatabase().purchases);
}

export function getAffiliateByUserId(userId: string): AffiliateProfile | null {
  const db = readDatabase();
  return db.affiliate_profiles.find((p) => p.user_id === userId) ?? null;
}

export function enrollAffiliate(user: UserProfile): AffiliateProfile {
  const existing = getAffiliateByUserId(user.id);
  if (existing) return existing;

  const profile: AffiliateProfile = {
    id: generateId(),
    user_id: user.id,
    status: 'active',
    partner_level: 'builder',
    referral_code: user.id,
    commission_override_percent: null,
    approved_at: now(),
    disabled_at: null,
    disabled_reason: null,
    created_at: now(),
    updated_at: now(),
  };

  updateDatabase((db) => {
    db.affiliate_profiles.push(profile);
    db.affiliate_links.push({
      id: generateId(),
      affiliate_id: profile.id,
      code: profile.referral_code,
      landing_path: '/',
      is_primary: true,
      created_at: profile.created_at,
    });
  });

  return profile;
}

export function getOrEnrollAffiliate(user: UserProfile): AffiliateProfile {
  return getAffiliateByUserId(user.id) ?? enrollAffiliate(user);
}

export function getReferralLinkForUser(user: UserProfile): string {
  const affiliate = getOrEnrollAffiliate(user);
  return buildReferralUrl(affiliate.referral_code);
}

function sumCents(commissions: AffiliateCommission[], filter: (c: AffiliateCommission) => boolean) {
  return commissions.filter(filter).reduce((s, c) => s + c.amount_cents, 0);
}

export function computeDashboardStats(affiliateId: string): AffiliateDashboardStats {
  const db = readDatabase();
  const clicks = db.affiliate_clicks.filter((c) => c.affiliate_id === affiliateId).length;
  const referrals = db.affiliate_referrals.filter((r) => r.affiliate_id === affiliateId);
  const leads = referrals.filter((r) => r.status === 'lead').length;
  const sales = referrals.filter((r) => r.status === 'converted').length;
  const mrrCustomers = referrals.filter(
    (r) => r.status === 'converted' && r.product === 'monthly_build_pro'
  ).length;

  const commissions = db.affiliate_commissions.filter((c) => c.affiliate_id === affiliateId);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const monthlyCommission = sumCents(
    commissions,
    (c) => c.is_recurring && new Date(c.created_at) >= monthStart
  );

  return {
    clicks,
    leads,
    sales,
    monthly_recurring_customers: mrrCustomers,
    monthly_commission_cents: monthlyCommission,
    lifetime_commission_cents: sumCents(commissions, () => true),
    pending_commission_cents: sumCents(commissions, (c) => c.status === 'pending'),
    approved_commission_cents: sumCents(commissions, (c) => c.status === 'approved'),
    paid_commission_cents: sumCents(commissions, (c) => c.status === 'paid'),
  };
}

export function getProgramConfig(): AffiliateProgramConfig {
  const db = readDatabase();
  return (
    db.affiliate_program_config ?? {
      minimum_payout_cents: PAYOUT_MINIMUM_CENTS,
      payout_method: 'paypal',
      payout_schedule: 'Manual — once per month',
      updated_at: new Date().toISOString(),
    }
  );
}

export function updateProgramConfig(
  data: Partial<Pick<AffiliateProgramConfig, 'minimum_payout_cents' | 'payout_schedule'>>
): AffiliateProgramConfig {
  let updated: AffiliateProgramConfig | null = null;
  updateDatabase((db) => {
    updated = {
      ...getProgramConfig(),
      ...data,
      updated_at: now(),
    };
    db.affiliate_program_config = updated;
  });
  return updated!;
}

export function computePayoutBalance(affiliateId: string): AffiliatePayoutBalance {
  const config = getProgramConfig();
  const commissions = readDatabase().affiliate_commissions.filter(
    (c) => c.affiliate_id === affiliateId
  );
  const pending = sumCents(commissions, (c) => c.status === 'pending');
  const approved = sumCents(commissions, (c) => c.status === 'approved');
  const paid = sumCents(commissions, (c) => c.status === 'paid');
  const minimum = config.minimum_payout_cents;
  const untilNext = Math.max(0, minimum - approved);

  return {
    current_balance_cents: approved,
    pending_cents: pending,
    approved_cents: approved,
    paid_cents: paid,
    until_next_payout_cents: untilNext,
    minimum_payout_cents: minimum,
    eligible_for_payout: approved >= minimum,
  };
}

export function getPayoutSettings(affiliateId: string): AffiliatePayoutSettings | null {
  return (
    readDatabase().affiliate_payout_settings.find((s) => s.affiliate_id === affiliateId) ?? null
  );
}

export function savePayoutSettings(
  affiliateId: string,
  data: Omit<AffiliatePayoutSettings, 'affiliate_id' | 'updated_at'>
): AffiliatePayoutSettings {
  const settings: AffiliatePayoutSettings = {
    affiliate_id: affiliateId,
    ...data,
    updated_at: now(),
  };
  updateDatabase((db) => {
    const idx = db.affiliate_payout_settings.findIndex((s) => s.affiliate_id === affiliateId);
    if (idx >= 0) db.affiliate_payout_settings[idx] = settings;
    else db.affiliate_payout_settings.push(settings);
  });
  return settings;
}

export function getPayoutsForAffiliate(affiliateId: string): AffiliatePayout[] {
  return readDatabase()
    .affiliate_payouts.filter((p) => p.affiliate_id === affiliateId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getAllPayouts(): AffiliatePayout[] {
  return readDatabase()
    .affiliate_payouts.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function getAdminPayoutRows(): AffiliatePayoutAdminRow[] {
  const db = readDatabase();
  return db.affiliate_profiles
    .filter((p) => p.status === 'active')
    .map((profile) => {
      const user = db.users.find((u) => u.id === profile.user_id);
      const settings = getPayoutSettings(profile.id);
      const balance = computePayoutBalance(profile.id);
      return {
        affiliate_id: profile.id,
        email: user?.email ?? 'unknown',
        full_name: user?.full_name ?? null,
        paypal_email: settings?.paypal_email ?? null,
        approved_balance_cents: balance.approved_cents,
        eligible_for_payout: balance.eligible_for_payout && !!settings?.paypal_email,
        payout_settings_complete: !!settings?.paypal_email && !!settings?.full_name,
      };
    })
    .sort((a, b) => b.approved_balance_cents - a.approved_balance_cents);
}

export function createManualPayout(
  affiliateId: string,
  options: { reference?: string; notes?: string } = {}
): AffiliatePayout | null {
  const balance = computePayoutBalance(affiliateId);
  if (!balance.eligible_for_payout) return null;

  const settings = getPayoutSettings(affiliateId);
  const config = getProgramConfig();
  const db = readDatabase();
  const approvedCommissions = db.affiliate_commissions.filter(
    (c) => c.affiliate_id === affiliateId && c.status === 'approved'
  );
  if (approvedCommissions.length === 0) return null;

  const amount = balance.approved_cents;
  const commissionIds = approvedCommissions.map((c) => c.id);
  const paidAt = now();
  const periodLabel = new Date().toISOString().slice(0, 7);

  const payout: AffiliatePayout = {
    id: generateId(),
    affiliate_id: affiliateId,
    amount_cents: amount,
    commission_ids: commissionIds,
    status: 'paid',
    payment_method: config.payout_method,
    period_label: periodLabel,
    reference: options.reference ?? `MANUAL-${Date.now()}`,
    notes: options.notes ?? null,
    paypal_email: settings?.paypal_email ?? null,
    export_ref: null,
    created_at: paidAt,
    paid_at: paidAt,
  };

  updateDatabase((db) => {
    db.affiliate_payouts.push(payout);
    for (const comm of db.affiliate_commissions) {
      if (commissionIds.includes(comm.id)) {
        comm.status = 'paid';
        comm.paid_at = paidAt;
      }
    }
  });

  return payout;
}

export function getCommissionsForAffiliate(affiliateId: string): AffiliateCommission[] {
  return readDatabase()
    .affiliate_commissions.filter((c) => c.affiliate_id === affiliateId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getPublishedAssets(): AffiliateAsset[] {
  return readDatabase()
    .affiliate_assets.filter((a) => a.published)
    .sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
}

export function getAssetsByCategory(): Record<AffiliateAssetCategory, AffiliateAsset[]> {
  const assets = getPublishedAssets();
  const grouped = {} as Record<AffiliateAssetCategory, AffiliateAsset[]>;
  for (const asset of assets) {
    if (!grouped[asset.category]) grouped[asset.category] = [];
    grouped[asset.category].push(asset);
  }
  return grouped;
}

export function getLeaderboard(): AffiliateLeaderboardEntry[] {
  const db = readDatabase();
  const monthStart = new Date();
  monthStart.setDate(1);

  const entries = db.affiliate_profiles
    .filter((p) => p.status === 'active')
    .map((profile) => {
      const user = db.users.find((u) => u.id === profile.user_id);
      const referrals = db.affiliate_referrals.filter((r) => r.affiliate_id === profile.id);
      const commissions = db.affiliate_commissions.filter((c) => c.affiliate_id === profile.id);
      const sales = referrals.filter((r) => r.status === 'converted').length;
      const monthlySales = referrals.filter(
        (r) => r.status === 'converted' && r.converted_at && new Date(r.converted_at) >= monthStart
      ).length;

      return {
        affiliate_id: profile.id,
        display_name: user?.full_name ?? user?.email?.split('@')[0] ?? 'Member',
        sales,
        monthly_sales: monthlySales,
        lifetime_sales_cents: commissions.reduce((s, c) => s + c.amount_cents, 0),
        is_placeholder: profile.id.startsWith('aff_placeholder'),
      };
    })
    .sort((a, b) => b.lifetime_sales_cents - a.lifetime_sales_cents || b.sales - a.sales)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return entries;
}

// --- Admin ---

export function getAllAffiliateProfiles(): AffiliateProfile[] {
  return readDatabase().affiliate_profiles;
}

export function getAffiliateProfileById(id: string): AffiliateProfile | null {
  return readDatabase().affiliate_profiles.find((p) => p.id === id) ?? null;
}

export function updateAffiliateStatus(
  id: string,
  status: AffiliateStatus,
  reason?: string
): AffiliateProfile | null {
  let updated: AffiliateProfile | null = null;
  updateDatabase((db) => {
    const idx = db.affiliate_profiles.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const profile = db.affiliate_profiles[idx];
    updated = {
      ...profile,
      status,
      updated_at: now(),
      approved_at: status === 'active' ? now() : profile.approved_at,
      disabled_at: status === 'disabled' ? now() : null,
      disabled_reason: status === 'disabled' ? (reason ?? null) : null,
    };
    db.affiliate_profiles[idx] = updated;
  });
  return updated;
}

export function setCommissionOverride(
  affiliateId: string,
  percent: number | null
): AffiliateProfile | null {
  let updated: AffiliateProfile | null = null;
  updateDatabase((db) => {
    const idx = db.affiliate_profiles.findIndex((p) => p.id === affiliateId);
    if (idx === -1) return;
    updated = {
      ...db.affiliate_profiles[idx],
      commission_override_percent: percent,
      updated_at: now(),
    };
    db.affiliate_profiles[idx] = updated;
  });
  return updated;
}

export function computeAdminStats(): AffiliateAdminStats {
  const db = readDatabase();
  const active = db.affiliate_profiles.filter((p) => p.status === 'active');
  const pending = db.affiliate_profiles.filter((p) => p.status === 'pending');
  const converted = db.affiliate_referrals.filter((r) => r.status === 'converted');

  return {
    total_affiliates: db.affiliate_profiles.length,
    active_affiliates: active.length,
    pending_affiliates: pending.length,
    total_clicks: db.affiliate_clicks.length,
    total_sales: converted.length,
    pending_payout_cents: db.affiliate_commissions
      .filter((c) => c.status === 'approved')
      .reduce((s, c) => s + c.amount_cents, 0),
    lifetime_paid_cents: db.affiliate_commissions
      .filter((c) => c.status === 'paid')
      .reduce((s, c) => s + c.amount_cents, 0),
  };
}

export function getAllCommissions(): AffiliateCommission[] {
  return readDatabase()
    .affiliate_commissions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

export function approveCommission(id: string): AffiliateCommission | null {
  let updated: AffiliateCommission | null = null;
  updateDatabase((db) => {
    const idx = db.affiliate_commissions.findIndex((c) => c.id === id);
    if (idx === -1) return;
    updated = {
      ...db.affiliate_commissions[idx],
      status: 'approved',
      approved_at: now(),
    };
    db.affiliate_commissions[idx] = updated;
  });
  return updated;
}
