/** Affiliate Center — types ready for Supabase migration */

export type AffiliateStatus = 'pending' | 'active' | 'disabled';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'reversed';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type AffiliateProductSlug = 'builder_pass' | 'monthly_build_pro';
export type AffiliateAssetCategory =
  | 'facebook_posts'
  | 'short_posts'
  | 'email_templates'
  | 'headline_ideas'
  | 'hooks'
  | 'images'
  | 'banners'
  | 'video_scripts'
  | 'future_downloads';

/** Future-ready partner tiers */
export type PartnerLevel = 'builder' | 'builder_pro' | 'strategic';

export interface AffiliateProfile {
  id: string;
  user_id: string;
  status: AffiliateStatus;
  partner_level: PartnerLevel;
  referral_code: string;
  /** Custom commission override (cents). null = use product defaults */
  commission_override_percent: number | null;
  approved_at: string | null;
  disabled_at: string | null;
  disabled_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AffiliateLink {
  id: string;
  affiliate_id: string;
  code: string;
  landing_path: string;
  is_primary: boolean;
  created_at: string;
}

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  link_id: string;
  referrer_url: string | null;
  user_agent: string | null;
  ip_hash: string | null;
  created_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id: string | null;
  referred_email: string;
  product: AffiliateProductSlug;
  status: 'lead' | 'converted' | 'churned';
  converted_at: string | null;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string;
  product: AffiliateProductSlug;
  /** Display label e.g. "Alex M." — anonymized in production */
  customer_label: string;
  amount_cents: number;
  is_recurring: boolean;
  period_start: string | null;
  period_end: string | null;
  status: CommissionStatus;
  created_at: string;
  approved_at: string | null;
  paid_at: string | null;
}

export type PayoutMethod = 'paypal' | 'stripe_connect' | 'wise' | 'bank_transfer';

export interface AffiliatePayoutSettings {
  affiliate_id: string;
  paypal_email: string;
  full_name: string;
  country: string;
  preferred_currency: string;
  updated_at: string;
}

/** Global program config — admin-editable */
export interface AffiliateProgramConfig {
  minimum_payout_cents: number;
  payout_method: PayoutMethod;
  payout_schedule: string;
  updated_at: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount_cents: number;
  commission_ids: string[];
  status: PayoutStatus;
  payment_method: PayoutMethod;
  period_label: string;
  reference: string | null;
  notes: string | null;
  paypal_email: string | null;
  export_ref: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface AffiliateAsset {
  id: string;
  category: AffiliateAssetCategory;
  title: string;
  content: string;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
}

/** Aggregated dashboard view */
export interface AffiliateDashboardStats {
  clicks: number;
  leads: number;
  sales: number;
  monthly_recurring_customers: number;
  monthly_commission_cents: number;
  lifetime_commission_cents: number;
  pending_commission_cents: number;
  approved_commission_cents: number;
  paid_commission_cents: number;
}

export interface AffiliatePayoutBalance {
  current_balance_cents: number;
  pending_cents: number;
  approved_cents: number;
  paid_cents: number;
  until_next_payout_cents: number;
  minimum_payout_cents: number;
  eligible_for_payout: boolean;
}

export interface AffiliatePayoutAdminRow {
  affiliate_id: string;
  email: string;
  full_name: string | null;
  paypal_email: string | null;
  approved_balance_cents: number;
  eligible_for_payout: boolean;
  payout_settings_complete: boolean;
}

export interface AffiliateLeaderboardEntry {
  rank: number;
  affiliate_id: string;
  display_name: string;
  sales: number;
  monthly_sales: number;
  lifetime_sales_cents: number;
  is_placeholder: boolean;
}

export interface AffiliateAdminStats {
  total_affiliates: number;
  active_affiliates: number;
  pending_affiliates: number;
  total_clicks: number;
  total_sales: number;
  pending_payout_cents: number;
  lifetime_paid_cents: number;
}

/** Future-ready campaign architecture (not implemented) */
export interface AffiliateCampaignStub {
  id: string;
  name: string;
  type: 'coupon' | 'launch_contest' | 'bonus_commission' | 'special_offer';
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}
