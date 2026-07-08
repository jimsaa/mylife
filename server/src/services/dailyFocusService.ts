import { getDb } from '../db/connection.js';
import type { DailyFocus } from '../types/index.js';

export function getDailyFocus(date: string): DailyFocus | null {
  const row = getDb().prepare('SELECT * FROM daily_focus WHERE date = ?').get(date) as DailyFocus | undefined;
  return row ?? null;
}

export function upsertDailyFocus(date: string, focus_text: string): DailyFocus {
  getDb()
    .prepare(
      `INSERT INTO daily_focus (date, focus_text) VALUES (?, ?)
       ON CONFLICT(date) DO UPDATE SET focus_text = excluded.focus_text, updated_at = datetime('now')`
    )
    .run(date, focus_text);
  return getDailyFocus(date)!;
}
