import fs from 'fs';
import path from 'path';
import type { Database } from './types';
import { DB_VERSION } from './types';
import { buildSeedDatabase } from './seed';

const DATA_DIR = path.join(process.cwd(), 'data', 'store');
const DB_FILE = path.join(DATA_DIR, 'database.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDatabase(): Database {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    const seed = buildSeedDatabase();
    writeDatabase(seed);
    return seed;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(raw) as Database;
  if (db.meta?.version !== DB_VERSION) {
    const migrated = migrateDatabase(db);
    writeDatabase(migrated);
    return migrated;
  }
  return db;
}

export function writeDatabase(db: Database): void {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export function updateDatabase(mutator: (db: Database) => void): Database {
  const db = readDatabase();
  mutator(db);
  writeDatabase(db);
  return db;
}

function migrateDatabase(db: Database): Database {
  const seed = buildSeedDatabase();
  return {
    ...seed,
    users: db.users?.length
      ? db.users.map((u) => ({
          ...u,
          onboarding_completed_at:
            u.onboarding_completed_at ??
            (u.role === 'ADMIN' ? new Date().toISOString() : null),
          preferred_ai_chat: u.preferred_ai_chat ?? null,
        }))
      : seed.users,
    purchases: db.purchases ?? seed.purchases,
    user_progress: db.user_progress ?? [],
    affiliate_profiles: db.affiliate_profiles?.length ? db.affiliate_profiles : seed.affiliate_profiles,
    affiliate_links: db.affiliate_links?.length ? db.affiliate_links : seed.affiliate_links,
    affiliate_clicks: db.affiliate_clicks?.length ? db.affiliate_clicks : seed.affiliate_clicks,
    affiliate_referrals: db.affiliate_referrals?.length ? db.affiliate_referrals : seed.affiliate_referrals,
    affiliate_commissions: db.affiliate_commissions?.length ? db.affiliate_commissions : seed.affiliate_commissions,
    affiliate_payouts: db.affiliate_payouts?.length ? db.affiliate_payouts : seed.affiliate_payouts,
    affiliate_payout_settings: db.affiliate_payout_settings?.length
      ? db.affiliate_payout_settings
      : seed.affiliate_payout_settings,
    affiliate_program_config: db.affiliate_program_config ?? seed.affiliate_program_config,
    affiliate_assets: db.affiliate_assets?.length ? db.affiliate_assets : seed.affiliate_assets,
    ai_tools: db.ai_tools?.length ? mergeAiTools(db.ai_tools, seed.ai_tools) : seed.ai_tools,
    tool_clicks: db.tool_clicks ?? seed.tool_clicks,
    meta: { seeded_at: db.meta?.seeded_at ?? seed.meta.seeded_at, version: DB_VERSION },
  };
}

function mergeAiTools(existing: Database['ai_tools'], seeded: Database['ai_tools']) {
  const seedById = new Map(seeded.map((t) => [t.id, t]));
  const merged = existing.map((t) => {
    const s = seedById.get(t.id);
    return {
      ...t,
      slug: t.slug || s?.slug || t.name.toLowerCase().replace(/\s+/g, '-'),
      click_count: t.click_count ?? s?.click_count ?? 0,
    };
  });
  for (const tool of seeded) {
    if (!merged.some((t) => t.id === tool.id)) merged.push(tool);
  }
  return merged;
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
