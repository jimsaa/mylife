import type {
  AffiliateAsset,
  AffiliateClick,
  AffiliateCommission,
  AffiliateLink,
  AffiliateProfile,
  AffiliateReferral,
} from '@/types/affiliate';

const DEMO_AFFILIATE_ID = 'aff_demo_admin';
const DEMO_USER_ID = 'admin_seed';

export const MOCK_AFFILIATE_PROFILES: AffiliateProfile[] = [
  {
    id: DEMO_AFFILIATE_ID,
    user_id: DEMO_USER_ID,
    status: 'active',
    partner_level: 'builder',
    referral_code: DEMO_USER_ID,
    commission_override_percent: null,
    approved_at: '2026-01-15T10:00:00.000Z',
    disabled_at: null,
    disabled_reason: null,
    created_at: '2026-01-15T10:00:00.000Z',
    updated_at: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'aff_placeholder_2',
    user_id: 'user_placeholder_2',
    status: 'active',
    partner_level: 'builder',
    referral_code: 'user_placeholder_2',
    commission_override_percent: null,
    approved_at: '2026-02-01T10:00:00.000Z',
    disabled_at: null,
    disabled_reason: null,
    created_at: '2026-02-01T10:00:00.000Z',
    updated_at: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'aff_placeholder_3',
    user_id: 'user_placeholder_3',
    status: 'active',
    partner_level: 'builder',
    referral_code: 'user_placeholder_3',
    commission_override_percent: null,
    approved_at: '2026-02-10T10:00:00.000Z',
    disabled_at: null,
    disabled_reason: null,
    created_at: '2026-02-10T10:00:00.000Z',
    updated_at: '2026-02-10T10:00:00.000Z',
  },
];

export const MOCK_AFFILIATE_LINKS: AffiliateLink[] = MOCK_AFFILIATE_PROFILES.map((p) => ({
  id: `link_${p.id}`,
  affiliate_id: p.id,
  code: p.referral_code,
  landing_path: '/',
  is_primary: true,
  created_at: p.created_at,
}));

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const MOCK_AFFILIATE_CLICKS: AffiliateClick[] = Array.from({ length: 47 }, (_, i) => ({
  id: `click_${i}`,
  affiliate_id: DEMO_AFFILIATE_ID,
  link_id: `link_${DEMO_AFFILIATE_ID}`,
  referrer_url: i % 3 === 0 ? 'https://facebook.com' : null,
  user_agent: null,
  ip_hash: null,
  created_at: daysAgo(i % 14),
}));

export const MOCK_AFFILIATE_REFERRALS: AffiliateReferral[] = [
  {
    id: 'ref_1',
    affiliate_id: DEMO_AFFILIATE_ID,
    referred_user_id: 'user_ref_1',
    referred_email: 'lead***@example.com',
    product: 'builder_pass',
    status: 'converted',
    converted_at: daysAgo(5),
    created_at: daysAgo(12),
  },
  {
    id: 'ref_2',
    affiliate_id: DEMO_AFFILIATE_ID,
    referred_user_id: null,
    referred_email: 'prospect***@example.com',
    product: 'builder_pass',
    status: 'lead',
    converted_at: null,
    created_at: daysAgo(3),
  },
  {
    id: 'ref_3',
    affiliate_id: DEMO_AFFILIATE_ID,
    referred_user_id: 'user_ref_3',
    referred_email: 'member***@example.com',
    product: 'monthly_build_pro',
    status: 'converted',
    converted_at: daysAgo(20),
    created_at: daysAgo(25),
  },
];

export const MOCK_AFFILIATE_COMMISSIONS: AffiliateCommission[] = [
  {
    id: 'comm_1',
    affiliate_id: DEMO_AFFILIATE_ID,
    referral_id: 'ref_1',
    product: 'builder_pass',
    customer_label: 'Member A.',
    amount_cents: 450,
    is_recurring: false,
    period_start: null,
    period_end: null,
    status: 'approved',
    created_at: daysAgo(5),
    approved_at: daysAgo(4),
    paid_at: null,
  },
  {
    id: 'comm_2',
    affiliate_id: DEMO_AFFILIATE_ID,
    referral_id: 'ref_3',
    product: 'monthly_build_pro',
    customer_label: 'Member B.',
    amount_cents: 475,
    is_recurring: true,
    period_start: daysAgo(20),
    period_end: daysAgo(0),
    status: 'paid',
    created_at: daysAgo(20),
    approved_at: daysAgo(19),
    paid_at: daysAgo(1),
  },
  {
    id: 'comm_3',
    affiliate_id: DEMO_AFFILIATE_ID,
    referral_id: 'ref_3',
    product: 'monthly_build_pro',
    customer_label: 'Member B.',
    amount_cents: 475,
    is_recurring: true,
    period_start: daysAgo(0),
    period_end: null,
    status: 'pending',
    created_at: daysAgo(0),
    approved_at: null,
    paid_at: null,
  },
  {
    id: 'comm_5',
    affiliate_id: DEMO_AFFILIATE_ID,
    referral_id: 'ref_1',
    product: 'builder_pass',
    customer_label: 'Member D.',
    amount_cents: 1300,
    is_recurring: false,
    period_start: null,
    period_end: null,
    status: 'approved',
    created_at: daysAgo(8),
    approved_at: daysAgo(7),
    paid_at: null,
  },
  {
    id: 'comm_4',
    affiliate_id: 'aff_placeholder_2',
    referral_id: 'ref_p2',
    product: 'builder_pass',
    customer_label: 'Member C.',
    amount_cents: 450,
    is_recurring: false,
    period_start: null,
    period_end: null,
    status: 'paid',
    created_at: daysAgo(10),
    approved_at: daysAgo(9),
    paid_at: daysAgo(2),
  },
];

export const MOCK_AFFILIATE_PAYOUT_SETTINGS = [
  {
    affiliate_id: DEMO_AFFILIATE_ID,
    paypal_email: 'admin@jimsaari.se',
    full_name: 'Admin',
    country: 'Sweden',
    preferred_currency: 'USD',
    updated_at: '2026-06-01T10:00:00.000Z',
  },
];

export const MOCK_AFFILIATE_PAYOUTS = [
  {
    id: 'payout_1',
    affiliate_id: DEMO_AFFILIATE_ID,
    amount_cents: 475,
    commission_ids: ['comm_2'],
    status: 'paid' as const,
    payment_method: 'paypal' as const,
    period_label: '2026-05',
    reference: 'PAYPAL-MANUAL-001',
    notes: 'May manual PayPal transfer',
    paypal_email: 'admin@jimsaari.se',
    export_ref: null,
    created_at: daysAgo(1),
    paid_at: daysAgo(1),
  },
];

export const MOCK_AFFILIATE_PROGRAM_CONFIG = {
  minimum_payout_cents: 2500,
  payout_method: 'paypal' as const,
  payout_schedule: 'Manual — once per month',
  updated_at: '2026-01-01T00:00:00.000Z',
};

export const MOCK_AFFILIATE_ASSETS: AffiliateAsset[] = [
  {
    id: 'asset_fb_1',
    category: 'facebook_posts',
    title: 'Practical AI workflow',
    content:
      "I've been using Builder Pass to actually build digital projects — not just watch videos. It's a practical step-by-step system ($3 launch offer, then $9 lifetime). Worth checking out if you're curious about AI + side projects.",
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_fb_2',
    category: 'facebook_posts',
    title: 'For affiliate marketers',
    content:
      'If you promote digital products, Builder Pass taught me how to use AI to build assets faster — websites, content, KDP ideas. One-time payment, lifetime access. Link in comments if you want it.',
    sort_order: 2,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_short_1',
    category: 'short_posts',
    title: 'Twitter / X',
    content:
      'Stop collecting AI PDFs. Start building. Builder Pass — low-friction entry to the AI Build Method. Practical workflow for non-coders.',
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_short_2',
    category: 'short_posts',
    title: 'LinkedIn',
    content:
      'The clearest AI building workflow I\'ve found for beginners. Builder Pass walks you from mindset → tools → your First Build Mission.',
    sort_order: 2,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_email_1',
    category: 'email_templates',
    title: 'Recommendation email',
    content: `Subject: A practical AI system I actually use

Hi [Name],

I wanted to share something that's been helpful for me — Builder Pass.

It's not another theory course. It teaches a clear workflow for building digital projects with AI (websites, content, affiliate assets) without needing to code.

Low-friction one-time payment with lifetime access ($3 launch offer). If you're exploring AI for side projects, here's my link:

[YOUR REFERRAL LINK]

No pressure — only sharing because I found it genuinely useful.

Best,
[Your name]`,
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_headline_1',
    category: 'headline_ideas',
    title: 'Clarity angle',
    content: 'Finally understand how AI tools work together',
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_headline_2',
    category: 'headline_ideas',
    title: 'Action angle',
    content: 'Build your first digital asset with AI — step by step',
    sort_order: 2,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_hook_1',
    category: 'hooks',
    title: 'Scroll stopper',
    content: 'I spent months watching AI videos. Then I found Builder Pass — a system that actually made me build something.',
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_hook_2',
    category: 'hooks',
    title: 'Beginner hook',
    content: "You don't need to be a programmer to build with AI. You need a workflow.",
    sort_order: 2,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_image_1',
    category: 'images',
    title: 'Square social (placeholder)',
    content:
      '[Image placeholder — 1080×1080] Use brand colors: dark background, violet accent, headline "Build with AI" + your referral link in bio/caption.',
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_banner_1',
    category: 'banners',
    title: 'Blog sidebar (placeholder)',
    content:
      '[Banner placeholder — 300×250] Builder Pass · AI Build Method · $3 launch · [YOUR LINK]',
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_video_1',
    category: 'video_scripts',
    title: '60-second explainer',
    content: `[HOOK] Most AI courses give you PDFs. This one makes you build.

[PROBLEM] You've watched dozens of AI videos but still don't know where to start.

[SOLUTION] Builder Pass is a step-by-step workflow — mindset, tools, and your First Build Mission.

[CTA] Link in description. One-time payment · Lifetime access.`,
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'asset_dl_1',
    category: 'future_downloads',
    title: 'Coming soon',
    content:
      'Branded image pack, story templates, and swipe files will be added here. Check back after launch.',
    sort_order: 1,
    published: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

export const DEMO_AFFILIATE_USER_ID = DEMO_USER_ID;
