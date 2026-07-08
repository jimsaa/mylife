import type { PromptCategory } from '@/types';
import {
  BUILDER_PASS_PRICES,
  MONTHLY_BUILD_PRO_PRICES,
  getBuilderPassPricing,
} from '@/lib/pricing';

export const BRAND = {
  name: 'Affiliate Insider',
  tagline: 'The AI-Powered Resource Hub for Affiliate Marketers',
} as const;

/** Product 1 — entry funnel. See docs/BUSINESS_MODEL.md */
export const BUILDER_PASS = {
  name: 'Builder Pass',
  slug: 'builder_pass',
  currency: 'usd',
  purpose: 'Qualify buyers and teach the AI Build Method.',
  includes: [
    'AI Build Journey',
    'Human + AI Chat + AI Builder framework',
    'Setup Wizard',
    'First Build Mission',
    'Lifetime access',
  ],
  launchPriceUsd: BUILDER_PASS_PRICES.launchUsd,
  standardPriceUsd: BUILDER_PASS_PRICES.standardUsd,
} as const;

/** Product 2 — primary business. See docs/BUSINESS_MODEL.md */
export const MONTHLY_BUILD_PRO = {
  name: 'Monthly Build Pro',
  slug: 'monthly_build_pro',
  currency: 'usd',
  priceUsd: MONTHLY_BUILD_PRO_PRICES.monthlyUsd,
  priceCents: MONTHLY_BUILD_PRO_PRICES.monthlyCents,
  purpose: 'Every month members build one complete digital project together.',
  exampleBuilds: [
    'KDP',
    'SaaS',
    'Lead Magnet',
    'Affiliate Website',
    'Printables',
    'Directories',
    'Automation',
    'AI Tools',
  ],
  includes: [
    'New Build Mission every month',
    'Complete step-by-step build guide',
    'Cursor prompts',
    'AI Chat prompts',
    'Templates',
    'Assets',
    'Project files',
    'Live Monthly Q&A',
    'Full Build Archive',
  ],
} as const;

/** Active Builder Pass checkout price (respects launch offer window) */
export function getProductCheckout() {
  const pricing = getBuilderPassPricing();
  return {
    name: BUILDER_PASS.name,
    slug: BUILDER_PASS.slug,
    currency: BUILDER_PASS.currency,
    priceUsd: pricing.priceUsd,
    priceCents: pricing.priceCents,
    isLaunchOffer: pricing.isLaunchOffer,
    standardPriceUsd: pricing.standardPriceUsd,
  };
}

/** @deprecated Use BUILDER_PASS + getProductCheckout() */
export const PRODUCT = {
  name: BUILDER_PASS.name,
  slug: BUILDER_PASS.slug,
  currency: BUILDER_PASS.currency,
  get priceUsd() {
    return getBuilderPassPricing().priceUsd;
  },
  get priceCents() {
    return getBuilderPassPricing().priceCents;
  },
} as const;

export const ROLE_HIERARCHY = ['FREE', 'VAULT_MEMBER', 'VIP_MEMBER', 'ADMIN'] as const;

export const PROMPT_CATEGORY_LABELS: Record<PromptCategory, string> = {
  facebook: 'Facebook',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  email: 'Email',
  affiliate: 'Affiliate',
  ads: 'Ads',
};

export const VAULT_NAV = [
  { href: '/vault', label: 'Dashboard', icon: 'LayoutDashboard' },
  { href: '/vault/start', label: 'Start Here', icon: 'Rocket' },
  { href: '/vault/prompts', label: 'Prompt Library', icon: 'Sparkles' },
  { href: '/vault/hooks', label: 'Hook Vault', icon: 'Zap' },
  { href: '/vault/ai-tools', label: 'AI Tools', icon: 'Bot' },
  { href: '/vault/programs', label: 'Affiliate Programs', icon: 'Handshake' },
  { href: '/vault/downloads', label: 'Downloads', icon: 'Download' },
  { href: '/vault/affiliate', label: 'Affiliate Center', icon: 'Share2', affiliateOnly: true },
  { href: '/vault/profile', label: 'Profile', icon: 'User' },
] as const;

export const LANDING_COMPARISON = {
  negative: {
    title: 'Most AI courses',
    items: ['Endless theory', 'Hundreds of PDFs', 'No implementation', 'Information overload'],
  },
  positive: {
    title: 'Builder Pass',
    items: ['Practical', 'Step-by-step', 'Build while learning', 'First Build Mission included'],
  },
} as const;

export const LEARN_MODULES = [
  { title: 'AI Mindset', description: 'Understand how AI actually works.' },
  { title: 'AI Workflow', description: 'Learn how humans + AI work together.' },
  { title: 'AI Building Method', description: 'Turn ideas into real projects.' },
  { title: 'AI Tool Stack', description: 'Know exactly which tools to use.' },
  { title: 'First Build Mission', description: 'Complete your first digital project.' },
] as const;

export const LANDING_AUDIENCE = [
  'Beginners',
  'Affiliate Marketers',
  'Creators',
  'Side Hustlers',
  'Digital Entrepreneurs',
  'Anyone curious about AI',
] as const;

export const PURCHASE_TIMELINE = [
  'Purchase Builder Pass',
  'Create account',
  'Complete setup wizard',
  'Start AI Build Journey',
  'Finish First Build Mission',
  'Upgrade to Monthly Build Pro',
] as const;

export const LANDING_TESTIMONIALS = [
  {
    quote: "The clearest explanation of AI workflows I've seen.",
    name: 'Alex M.',
    role: 'Affiliate marketer',
  },
  {
    quote: 'I finally understand how AI tools work together.',
    name: 'Jordan K.',
    role: 'Content creator',
  },
  {
    quote: 'This made AI much less intimidating.',
    name: 'Sam R.',
    role: 'Side hustler',
  },
] as const;

export const LANDING_FAQ = [
  {
    q: 'Do I need coding experience?',
    a: 'No. Builder Pass is designed for non-programmers. You will use AI tools and follow a clear workflow — not write code from scratch.',
  },
  {
    q: 'How long does it take?',
    a: 'Most learners complete the core journey in a few focused sessions. Your First Build Mission can be started within your first week if you follow along step by step.',
  },
  {
    q: 'Can I use ChatGPT?',
    a: 'Yes. The workflow works with ChatGPT and similar AI assistants. We teach principles that transfer across tools.',
  },
  {
    q: 'Can I use other AI tools?',
    a: 'Absolutely. You will learn a tool-agnostic workflow. Use whatever AI tools you prefer or already have access to.',
  },
  {
    q: 'Will I own what I build?',
    a: 'Yes. Projects you create are yours. You build real digital assets — websites, content, products — that you control.',
  },
  {
    q: 'What happens after I finish Builder Pass?',
    a: 'You will have a repeatable AI workflow and your First Build Mission completed. Monthly Build Pro ($29/month) adds a new full project every month with guides, prompts, templates, and live Q&A.',
  },
] as const;

export const LANDING_BENEFITS = [
  { icon: 'Sparkles', title: 'AI Build Journey', description: 'Step-by-step path from mindset to first project.' },
  { icon: 'Zap', title: 'Setup Wizard', description: 'Get your AI Builder and AI Chat ready in minutes.' },
  { icon: 'FileText', title: 'First Build Mission', description: 'Guided project — not theory alone.' },
  { icon: 'Bot', title: 'AI Tool Stack', description: 'Curated tools with pricing and links.' },
  { icon: 'Handshake', title: 'Human + AI Framework', description: 'How you and AI work together to ship.' },
  { icon: 'Download', title: 'Lifetime Access', description: 'Revisit the journey anytime — one payment.' },
] as const;

export const AUDIENCE = [
  'Affiliate beginners',
  'Content creators',
  'Faceless creators',
  'AI enthusiasts',
] as const;

export const FAQ_ITEMS = [
  {
    q: 'Is Builder Pass a subscription?',
    a: `No. Builder Pass is a one-time payment ($${BUILDER_PASS_PRICES.launchUsd} launch offer, then $${BUILDER_PASS_PRICES.standardUsd} lifetime). Monthly Build Pro is the optional $${MONTHLY_BUILD_PRO_PRICES.monthlyUsd}/month membership for ongoing monthly builds.`,
  },
  {
    q: 'Do I need experience?',
    a: 'No. Builder Pass is designed for beginners who want a faster start with AI and digital projects.',
  },
  {
    q: 'What is Monthly Build Pro?',
    a: `Monthly Build Pro ($${MONTHLY_BUILD_PRO_PRICES.monthlyUsd}/month) is our primary membership — every month you build one complete digital project together with step-by-step guides, prompts, templates, and live Q&A.`,
  },
  {
    q: 'Will new content be added?',
    a: 'Builder Pass includes lifetime access to the AI Build Journey. Monthly Build Pro adds a new Build Mission every month.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'Contact support within 7 days if Builder Pass is not what you expected.',
  },
] as const;
