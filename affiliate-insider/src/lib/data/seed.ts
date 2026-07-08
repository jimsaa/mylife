import { MOCK_AFFILIATE_PROGRAMS } from '@/data/mock/affiliate-programs';
import {
  MOCK_AFFILIATE_ASSETS,
  MOCK_AFFILIATE_CLICKS,
  MOCK_AFFILIATE_COMMISSIONS,
  MOCK_AFFILIATE_LINKS,
  MOCK_AFFILIATE_PAYOUTS,
  MOCK_AFFILIATE_PAYOUT_SETTINGS,
  MOCK_AFFILIATE_PROFILES,
  MOCK_AFFILIATE_PROGRAM_CONFIG,
  MOCK_AFFILIATE_REFERRALS,
} from '@/data/mock/affiliate-center';
import { MOCK_AI_TOOLS } from '@/data/mock/ai-tools';
import { MOCK_DOWNLOADS } from '@/data/mock/downloads';
import { MOCK_HOOKS } from '@/data/mock/hooks';
import { MOCK_PROMPTS } from '@/data/mock/prompts';
import { MOCK_UPDATES } from '@/data/mock/updates';
import type { Database } from './types';
import { DB_VERSION } from './types';
import {
  defaultContentMeta,
  type MonthlyDrop,
  type PromptCategory,
  type DownloadType,
  type WhatsNewItem,
} from '@/types';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@jimsaari.se';

function metaFromCreated(created_at: string) {
  return { ...defaultContentMeta(), created_at, updated_at: created_at };
}

function toWhatsNew(
  resource_type: WhatsNewItem['resource_type'],
  resource_id: string,
  title: string,
  description: string,
  created_at: string
): WhatsNewItem {
  return {
    id: `wn_${resource_id}`,
    resource_type,
    resource_id,
    title,
    description,
    created_at,
  };
}

export function buildSeedDatabase(): Database {
  const now = new Date().toISOString();

  const prompts = MOCK_PROMPTS.map((p) => ({
    ...p,
    category: p.category as PromptCategory,
    ...metaFromCreated(p.created_at),
    featured: p.id === 'p1' || p.id === 'p2',
  }));

  const hooks = MOCK_HOOKS.map((h) => ({
    ...h,
    ...metaFromCreated(now),
    featured: false,
  }));

  const ai_tools = MOCK_AI_TOOLS.map((t) => ({
    ...t,
    category: t.category,
    website_url: t.website_url,
    affiliate_url: t.affiliate_url,
    button_text: t.button_text,
    secondary_button_label: t.secondary_button_label,
    difficulty: t.difficulty,
    free_trial: t.free_trial,
    recommendation_status: t.recommendation_status,
    recommendation_reasons: t.recommendation_reasons,
    badge: t.badge,
    slug: t.slug,
    click_count: t.click_count ?? 0,
    ...metaFromCreated(now),
    featured: t.featured ?? false,
    priority: t.priority ?? 0,
  }));

  const affiliate_programs = MOCK_AFFILIATE_PROGRAMS.map((p) => ({
    id: p.id,
    name: p.name,
    commission: p.commission,
    cookie_duration: p.cookie_duration,
    payout: p.payout,
    category: p.category,
    notes: p.notes,
    website_url: p.apply_url,
    affiliate_url: p.apply_url,
    button_text: 'Apply',
    secondary_button_label: null,
    ...metaFromCreated(now),
    featured: p.id === 'ap5',
  }));

  const downloads = MOCK_DOWNLOADS.map((d) => ({
    ...d,
    type: d.type as DownloadType,
    ...metaFromCreated(d.created_at),
  }));

  const vault_updates = MOCK_UPDATES.map((u) => ({
    ...u,
    ...metaFromCreated(u.created_at),
    published: true,
    featured: false,
    draft: false,
    priority: 0,
  }));

  const monthly_drops: MonthlyDrop[] = [
    {
      id: 'drop_july_2026',
      title: 'July 2026 Drop',
      month: '2026-07',
      description: 'Summer content pack for affiliates and faceless creators.',
      image_url: null,
      release_date: '2026-07-01',
      items_included: [
        '+40 prompts',
        '+12 hooks',
        '+3 AI tools',
        '+1 template',
        '+1 PDF',
      ],
      visible_to: 'vault',
      ...metaFromCreated('2026-07-01T10:00:00Z'),
      featured: true,
    },
  ];

  const whats_new: WhatsNewItem[] = [
    ...prompts.slice(0, 3).map((p) =>
      toWhatsNew('prompt', p.id, p.title, p.description, p.created_at)
    ),
    ...monthly_drops.map((d) =>
      toWhatsNew('monthly_drop', d.id, d.title, d.description, d.release_date)
    ),
    ...vault_updates.map((u) =>
      toWhatsNew('vault_update', u.id, u.title, u.description, u.created_at)
    ),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    users: [
      {
        id: 'admin_seed',
        email: ADMIN_EMAIL,
        full_name: 'Admin',
        role: 'ADMIN',
        avatar_url: null,
        created_at: now,
        onboarding_completed_at: now,
        preferred_ai_chat: null,
      },
    ],
    purchases: [],
    prompts,
    hooks,
    ai_tools,
    affiliate_programs,
    downloads,
    vault_updates,
    monthly_drops,
    user_progress: [],
    whats_new,
    affiliate_profiles: MOCK_AFFILIATE_PROFILES,
    affiliate_links: MOCK_AFFILIATE_LINKS,
    affiliate_clicks: MOCK_AFFILIATE_CLICKS,
    affiliate_referrals: MOCK_AFFILIATE_REFERRALS,
    affiliate_commissions: MOCK_AFFILIATE_COMMISSIONS,
    affiliate_payouts: MOCK_AFFILIATE_PAYOUTS,
    affiliate_payout_settings: MOCK_AFFILIATE_PAYOUT_SETTINGS,
    affiliate_program_config: MOCK_AFFILIATE_PROGRAM_CONFIG,
    affiliate_assets: MOCK_AFFILIATE_ASSETS,
    tool_clicks: [],
    meta: { seeded_at: now, version: DB_VERSION },
  };
}
