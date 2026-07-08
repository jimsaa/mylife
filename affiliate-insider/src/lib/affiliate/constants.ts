import type { AffiliateAssetCategory, AffiliateProductSlug, PartnerLevel } from '@/types/affiliate';
import {
  BUILDER_PASS_PRICES,
  MONTHLY_BUILD_PRO_PRICES,
  getBuilderPassPricing,
} from '@/lib/pricing';

export const AFFILIATE_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://affiliateinsider.jimsaari.se';

function builderPassCommissionCents(): number {
  const price = getBuilderPassPricing().priceCents;
  return Math.round(price * 0.5);
}

function monthlyBuildProCommissionCents(): number {
  return Math.round(MONTHLY_BUILD_PRO_PRICES.monthlyCents * 0.25);
}

export const AFFILIATE_PRODUCTS: Record<
  AffiliateProductSlug,
  {
    name: string;
    price_cents: number;
    commission_percent: number;
    recurring: boolean;
    description: string;
  }
> = {
  builder_pass: {
    name: 'Builder Pass',
    get price_cents() {
      return getBuilderPassPricing().priceCents;
    },
    commission_percent: 50,
    recurring: false,
    get description() {
      const pricing = getBuilderPassPricing();
      const commission = builderPassCommissionCents() / 100;
      if (pricing.isLaunchOffer) {
        return `$${pricing.launchPriceUsd} launch · 50% commission ($${commission.toFixed(2)})`;
      }
      return `$${pricing.standardPriceUsd} lifetime · 50% commission ($${commission.toFixed(2)})`;
    },
  },
  monthly_build_pro: {
    name: 'Monthly Build Pro',
    price_cents: MONTHLY_BUILD_PRO_PRICES.monthlyCents,
    commission_percent: 25,
    recurring: true,
    description: `$${MONTHLY_BUILD_PRO_PRICES.monthlyUsd}/month · 25% recurring ($${(monthlyBuildProCommissionCents() / 100).toFixed(2)}/month)`,
  },
};

/** @deprecated Legacy slugs — kept for existing mock/DB records */
export const LEGACY_AFFILIATE_PRODUCT_SLUGS = {
  ai_income_builder: 'builder_pass',
  monthly_build: 'monthly_build_pro',
} as const;

export const PARTNER_LEVELS: Record<
  PartnerLevel,
  { label: string; min_sales: number; bonus_percent: number; future: boolean }
> = {
  builder: { label: 'Builder Partner', min_sales: 0, bonus_percent: 0, future: false },
  builder_pro: { label: 'Builder Pro', min_sales: 25, bonus_percent: 5, future: true },
  strategic: { label: 'Strategic Partner', min_sales: 100, bonus_percent: 10, future: true },
};

export const ASSET_CATEGORY_LABELS: Record<AffiliateAssetCategory, string> = {
  facebook_posts: 'Facebook Posts',
  short_posts: 'Short Posts',
  email_templates: 'Email Templates',
  headline_ideas: 'Headline Ideas',
  hooks: 'Hooks',
  images: 'Images',
  banners: 'Banners',
  video_scripts: 'Video Scripts',
  future_downloads: 'Future Downloads',
};

export const PAYOUT_MINIMUM_CENTS = 2500; // $25 default — override via admin config
export const PAYOUT_METHOD_LABEL = 'PayPal';
export const PAYOUT_SCHEDULE = 'Manual — once per month';
