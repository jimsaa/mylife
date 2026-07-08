/**
 * Business Model V1 — LOCKED
 * See docs/BUSINESS_MODEL.md. Pricing changes require explicit founder decision.
 */

export const BUSINESS_MODEL_VERSION = 'v1' as const;
export const BUSINESS_MODEL_LOCKED = true;

/** First 30 days after public launch */
export const LAUNCH_CONFIG = {
  launchDate: process.env.NEXT_PUBLIC_LAUNCH_DATE ?? '2026-01-01',
  offerDays: 30,
} as const;

export const BUILDER_PASS_PRICES = {
  launchUsd: 3,
  launchCents: 300,
  standardUsd: 9,
  standardCents: 900,
} as const;

export const MONTHLY_BUILD_PRO_PRICES = {
  monthlyUsd: 29,
  monthlyCents: 2900,
} as const;

export interface BuilderPassPricing {
  isLaunchOffer: boolean;
  priceUsd: number;
  priceCents: number;
  standardPriceUsd: number;
  launchPriceUsd: number;
}

export function getBuilderPassPricing(now = new Date()): BuilderPassPricing {
  const launch = new Date(LAUNCH_CONFIG.launchDate);
  launch.setHours(0, 0, 0, 0);
  const offerEnd = new Date(launch);
  offerEnd.setDate(offerEnd.getDate() + LAUNCH_CONFIG.offerDays);

  const isLaunchOffer = now >= launch && now < offerEnd;

  return {
    isLaunchOffer,
    priceUsd: isLaunchOffer
      ? BUILDER_PASS_PRICES.launchUsd
      : BUILDER_PASS_PRICES.standardUsd,
    priceCents: isLaunchOffer
      ? BUILDER_PASS_PRICES.launchCents
      : BUILDER_PASS_PRICES.standardCents,
    standardPriceUsd: BUILDER_PASS_PRICES.standardUsd,
    launchPriceUsd: BUILDER_PASS_PRICES.launchUsd,
  };
}

export function formatBuilderPassPriceLabel(pricing = getBuilderPassPricing()): string {
  if (pricing.isLaunchOffer) {
    return `$${pricing.launchPriceUsd} launch offer · then $${pricing.standardPriceUsd} lifetime`;
  }
  return `$${pricing.standardPriceUsd} one-time · Lifetime access`;
}
