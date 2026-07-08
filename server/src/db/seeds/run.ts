import { getDb } from '../connection.js';
import { runMigrations } from '../migrate.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SEED_PROJECTS = [
  { name: 'High Pressure Bets', color: '#EF4444' },
  { name: 'CabRadar', color: '#3B82F6' },
  { name: 'MakerWorld Download Machine', color: '#22C55E' },
  { name: 'Digital Product Factory', color: '#A855F7' },
  { name: 'Monster Energy Collector', color: '#F59E0B' },
  { name: 'Taxi', color: '#EAB308' },
  { name: 'Administration', color: '#6B7280' },
  { name: 'Familj', color: '#EC4899' },
  { name: 'Egentid', color: '#14B8A6' },
];

const DEFAULT_SETTINGS: Record<string, string> = {
  calorie_target: '2500',
  weekly_focus_project_id: '',
  focused_work_project_names:
    'High Pressure Bets,CabRadar,MakerWorld Download Machine,Digital Product Factory,Monster Energy Collector,Administration',
  openai_api_key: '',
  sleep_import_vision_model: 'gpt-4o-mini',
  display_name: 'Jim',
  avatar_path: '',
};

export function runSeeds(): void {
  const db = getDb();

  const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  if (projectCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO projects (name, color, status, priority, created_at, updated_at)
      VALUES (?, ?, 'active', 3, datetime('now'), datetime('now'))
    `);
    for (const project of SEED_PROJECTS) {
      insert.run(project.name, project.color);
    }
    console.log(`Seeded ${SEED_PROJECTS.length} projects.`);
  } else {
    console.log('Projects already seeded, skipping.');
  }

  const upsertSetting = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO NOTHING
  `);
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    upsertSetting.run(key, value);
  }

  const avatarFile = path.resolve(__dirname, '../../data/avatars/avatar.png');
  const currentAvatar = db.prepare(`SELECT value FROM settings WHERE key = 'avatar_path'`).get() as
    | { value: string }
    | undefined;
  if (fs.existsSync(avatarFile) && !currentAvatar?.value) {
    db.prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES ('avatar_path', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
    ).run('avatars/avatar.png');
  }

  console.log('Default settings ensured.');
}

const isMain = process.argv[1]?.includes('seeds');

if (isMain) {
  runMigrations();
  runSeeds();
}
