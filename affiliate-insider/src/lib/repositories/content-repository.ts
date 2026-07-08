import type {
  AdminStats,
  AnalyticsPlaceholders,
  AffiliateProgram,
  AiTool,
  DownloadAsset,
  Hook,
  MonthlyDrop,
  Prompt,
  Purchase,
  SearchResult,
  UserProfile,
  UserProgress,
  VaultUpdate,
} from '@/types';
import {
  defaultContentMeta,
  defaultLinkFields,
  defaultOnboardingTasks,
} from '@/types';
import { buildToolGoUrl } from '@/lib/ai-tools/redirect';
import { getTopToolId } from '@/lib/repositories/tool-click-repository';
import type { ContentCollection } from '@/lib/admin/collections';
import { generateId, readDatabase, updateDatabase } from '../data/store';
import { recordWhatsNew } from './whats-new';

const WHATS_NEW_MAP: Record<ContentCollection, SearchResult['type'] | null> = {
  prompts: 'prompt',
  hooks: 'hook',
  ai_tools: 'ai_tool',
  affiliate_programs: 'affiliate_program',
  downloads: 'download',
  vault_updates: 'vault_update',
  monthly_drops: 'monthly_drop',
};

function publishedOnly<T extends { published: boolean; draft: boolean }>(items: T[]): T[] {
  return items.filter((i) => i.published && !i.draft);
}

// --- Public reads ---

export function getPublicPrompts(): Prompt[] {
  return publishedOnly(readDatabase().prompts).sort((a, b) => b.priority - a.priority);
}

export function getPublicHooks(): Hook[] {
  return publishedOnly(readDatabase().hooks);
}

export function toPublicAiTool(tool: AiTool, topToolId: string | null): AiTool {
  return {
    ...tool,
    affiliate_url: null,
    website_url: '',
    go_url: buildToolGoUrl(tool.slug),
    go_website_url: buildToolGoUrl(tool.slug, 'website'),
    is_top_tool: topToolId !== null && tool.id === topToolId,
  };
}

export function getPublicAiTools(): AiTool[] {
  const topId = getTopToolId();
  return publishedOnly(readDatabase().ai_tools)
    .sort((a, b) => b.priority - a.priority)
    .map((t) => toPublicAiTool(t, topId));
}

export function getPublicPrograms(): AffiliateProgram[] {
  return publishedOnly(readDatabase().affiliate_programs).sort((a, b) => b.priority - a.priority);
}

export function getPublicDownloads(): DownloadAsset[] {
  return publishedOnly(readDatabase().downloads);
}

export function getPublicMonthlyDrops(): MonthlyDrop[] {
  return publishedOnly(readDatabase().monthly_drops).sort(
    (a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
  );
}

export function getFeaturedMonthlyDrop(): MonthlyDrop | null {
  const drops = getPublicMonthlyDrops();
  return drops.find((d) => d.featured) ?? drops[0] ?? null;
}

export function getPublicVaultUpdates(): VaultUpdate[] {
  return publishedOnly(readDatabase().vault_updates);
}

// --- Admin reads (all) ---

export function getAllPrompts(): Prompt[] {
  return readDatabase().prompts;
}

export function getAllHooks(): Hook[] {
  return readDatabase().hooks;
}

export function getAllAiTools(): AiTool[] {
  return readDatabase().ai_tools;
}

export function getAllPrograms(): AffiliateProgram[] {
  return readDatabase().affiliate_programs;
}

export function getAllDownloads(): DownloadAsset[] {
  return readDatabase().downloads;
}

export function getAllVaultUpdates(): VaultUpdate[] {
  return readDatabase().vault_updates;
}

export function getAllMonthlyDrops(): MonthlyDrop[] {
  return readDatabase().monthly_drops;
}

// --- Generic CRUD ---

export function createItem(
  collection: ContentCollection,
  data: Record<string, unknown>
): Record<string, unknown> {
  const id = generateId();
  const meta = defaultContentMeta();
  const item = { ...data, id, ...meta, ...data };

  updateDatabase((db) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db[collection] as any[]).push(item);
    const wnType = WHATS_NEW_MAP[collection];
    if (wnType && item.published && !item.draft) {
      const rec = item as Record<string, unknown>;
      const title = String(rec.title ?? rec.name ?? rec.text ?? 'New content');
      recordWhatsNew(wnType, id, title, String(rec.description ?? ''));
    }
  });

  return item;
}

export function updateItem(
  collection: ContentCollection,
  id: string,
  data: Record<string, unknown>
): Record<string, unknown> | null {
  let updated: Record<string, unknown> | null = null;
  updateDatabase((db) => {
    const items = db[collection] as unknown as Array<Record<string, unknown> & { id: string }>;
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    updated = {
      ...items[idx],
      ...data,
      updated_at: new Date().toISOString(),
    };
    items[idx] = updated as typeof items[number];
  });
  return updated;
}

export function deleteItem(collection: ContentCollection, id: string): boolean {
  let deleted = false;
  updateDatabase((db) => {
    const before = (db[collection] as { id: string }[]).length;
    db[collection] = (db[collection] as { id: string }[]).filter((i) => i.id !== id) as never;
    deleted = (db[collection] as { id: string }[]).length < before;
    if (deleted) {
      db.whats_new = db.whats_new.filter((w) => w.resource_id !== id);
    }
  });
  return deleted;
}

export function getItemById(
  collection: ContentCollection,
  id: string
): Record<string, unknown> | null {
  const db = readDatabase();
  const items = db[collection] as unknown as Array<{ id: string }>;
  return (items.find((i) => i.id === id) as Record<string, unknown>) ?? null;
}

// --- Users & purchases ---

export function getUserByEmail(email: string): UserProfile | null {
  const normalized = email.toLowerCase();
  return readDatabase().users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export function getUserById(userId: string): UserProfile | null {
  return readDatabase().users.find((u) => u.id === userId) ?? null;
}

export function registerUser(user: Omit<UserProfile, 'id' | 'created_at'>): UserProfile {
  const db = readDatabase();
  const existing = db.users.find((u) => u.email.toLowerCase() === user.email.toLowerCase());
  if (existing) return existing;

  const profile: UserProfile = {
    ...user,
    id: generateId(),
    created_at: new Date().toISOString(),
    onboarding_completed_at: user.onboarding_completed_at ?? null,
    preferred_ai_chat: user.preferred_ai_chat ?? null,
  };
  updateDatabase((db) => {
    db.users.push(profile);
  });
  return profile;
}

export function completeUserOnboarding(
  userId: string,
  data: { preferred_ai_chat?: string | null } = {}
): UserProfile | null {
  let updated: UserProfile | null = null;
  const now = new Date().toISOString();
  updateDatabase((db) => {
    const idx = db.users.findIndex((u) => u.id === userId);
    if (idx === -1) return;
    updated = {
      ...db.users[idx],
      onboarding_completed_at: now,
      preferred_ai_chat: data.preferred_ai_chat ?? db.users[idx].preferred_ai_chat,
    };
    db.users[idx] = updated;
  });
  return updated;
}

export function recordPurchase(purchase: Omit<Purchase, 'id' | 'created_at'>): Purchase {
  const p: Purchase = { ...purchase, id: generateId(), created_at: new Date().toISOString() };
  updateDatabase((db) => {
    db.purchases.push(p);
  });
  return p;
}

export function getAdminStats(): AdminStats {
  const db = readDatabase();
  const vault = db.users.filter((u) => u.role === 'VAULT_MEMBER').length;
  const vip = db.users.filter((u) => u.role === 'VIP_MEMBER').length;
  const completed = db.purchases.filter((p) => p.status === 'completed').length;
  const signups = db.users.filter((u) => u.role !== 'ADMIN').length;

  return {
    total_members: signups,
    vault_members: vault,
    vip_members: vip,
    products_sold: completed,
    conversion_rate: signups > 0 ? Math.round((completed / signups) * 100) : null,
    recent_signups: [...db.users]
      .filter((u) => u.role !== 'ADMIN')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8),
    recent_purchases: [...db.purchases]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8),
  };
}

export function getAnalyticsPlaceholders(): AnalyticsPlaceholders {
  return {
    most_viewed_tools: [
      { name: 'ChatGPT', views: 0 },
      { name: 'Canva', views: 0 },
      { name: 'CapCut', views: 0 },
    ],
    most_copied_prompts: [
      { title: 'Facebook Ad Angle Generator', copies: 0 },
      { title: 'TikTok Script — PAS', copies: 0 },
    ],
    favorite_ai_tools: [
      { name: 'Claude', saves: 0 },
      { name: 'Jasper', saves: 0 },
    ],
  };
}

// --- Onboarding ---

export function getUserProgress(userId: string): UserProgress {
  const db = readDatabase();
  const existing = db.user_progress.find((p) => p.user_id === userId);
  if (existing) return existing;
  return {
    user_id: userId,
    tasks: defaultOnboardingTasks(),
    updated_at: new Date().toISOString(),
  };
}

export function updateUserProgress(
  userId: string,
  tasks: Partial<UserProgress['tasks']>
): UserProgress {
  let result: UserProgress | null = null;
  updateDatabase((db) => {
    const idx = db.user_progress.findIndex((p) => p.user_id === userId);
    const merged = {
      ...(idx >= 0 ? db.user_progress[idx].tasks : defaultOnboardingTasks()),
      ...tasks,
    };
    result = {
      user_id: userId,
      tasks: merged,
      updated_at: new Date().toISOString(),
    };
    if (idx >= 0) db.user_progress[idx] = result;
    else db.user_progress.push(result);
  });
  return result!;
}

// --- Global search ---

export function globalSearch(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const db = readDatabase();
  const results: SearchResult[] = [];

  for (const p of publishedOnly(db.prompts)) {
    if (p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
      results.push({
        type: 'prompt',
        id: p.id,
        title: p.title,
        description: p.description,
        href: `/vault/prompts?q=${encodeURIComponent(p.title)}`,
      });
    }
  }
  for (const h of publishedOnly(db.hooks)) {
    if (h.text.toLowerCase().includes(q)) {
      results.push({
        type: 'hook',
        id: h.id,
        title: h.text.slice(0, 60),
        description: `${h.platform} · ${h.category}`,
        href: '/vault/hooks',
      });
    }
  }
  for (const t of publishedOnly(db.ai_tools)) {
    if (t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) {
      results.push({
        type: 'ai_tool',
        id: t.id,
        title: t.name,
        description: t.description,
        href: '/vault/ai-tools',
      });
    }
  }
  for (const p of publishedOnly(db.affiliate_programs)) {
    if (p.name.toLowerCase().includes(q)) {
      results.push({
        type: 'affiliate_program',
        id: p.id,
        title: p.name,
        description: p.commission,
        href: '/vault/programs',
      });
    }
  }
  for (const d of publishedOnly(db.downloads)) {
    if (d.title.toLowerCase().includes(q)) {
      results.push({
        type: 'download',
        id: d.id,
        title: d.title,
        description: d.description,
        href: '/vault/downloads',
      });
    }
  }

  return results.slice(0, 20);
}

export { defaultLinkFields };
