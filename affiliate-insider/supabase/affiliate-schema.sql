-- Affiliate Center — Supabase schema proposal
-- Run after core schema.sql when implementing production affiliate system

CREATE TYPE affiliate_status AS ENUM ('pending', 'active', 'disabled');
CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid', 'reversed');
CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE partner_level AS ENUM ('builder', 'builder_pro', 'strategic');
CREATE TYPE affiliate_product AS ENUM ('ai_income_builder', 'monthly_build');

CREATE TABLE affiliate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  status affiliate_status NOT NULL DEFAULT 'pending',
  partner_level partner_level NOT NULL DEFAULT 'builder',
  referral_code TEXT NOT NULL UNIQUE,
  commission_override_percent NUMERIC(5,2),
  approved_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  disabled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  landing_path TEXT NOT NULL DEFAULT '/',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_links_code ON affiliate_links(code);

CREATE TABLE affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  link_id UUID REFERENCES affiliate_links(id) ON DELETE SET NULL,
  referrer_url TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_clicks_affiliate ON affiliate_clicks(affiliate_id, created_at DESC);

CREATE TABLE affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referred_email TEXT NOT NULL,
  product affiliate_product NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('lead', 'converted', 'churned')),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliate_referrals_affiliate ON affiliate_referrals(affiliate_id);

CREATE TABLE affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  referral_id UUID REFERENCES affiliate_referrals(id) ON DELETE SET NULL,
  product affiliate_product NOT NULL,
  customer_label TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  status commission_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_affiliate_commissions_status ON affiliate_commissions(status, affiliate_id);

CREATE TABLE affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliate_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  commission_ids UUID[] NOT NULL DEFAULT '{}',
  status payout_status NOT NULL DEFAULT 'pending',
  period_label TEXT NOT NULL,
  export_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE TABLE affiliate_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Future: campaigns, coupons, contests
-- CREATE TABLE affiliate_campaigns (...);
-- CREATE TABLE affiliate_coupons (...);

-- RLS: affiliates read own data; admins read all
ALTER TABLE affiliate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_commissions ENABLE ROW LEVEL SECURITY;
