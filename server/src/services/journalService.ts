import { getDb } from '../db/connection.js';
import type { DailyNote } from '../types/index.js';

export function getDailyNote(date: string): DailyNote | null {
  const row = getDb().prepare('SELECT * FROM daily_notes WHERE date = ?').get(date) as DailyNote | undefined;
  return row ?? null;
}

export function getDailyNotes(limit = 30): DailyNote[] {
  return getDb()
    .prepare('SELECT * FROM daily_notes ORDER BY date DESC LIMIT ?')
    .all(limit) as DailyNote[];
}

export function upsertDailyNote(
  date: string,
  data: { journal_text?: string | null; reflection_text?: string | null }
): DailyNote {
  const existing = getDailyNote(date);
  getDb()
    .prepare(
      `INSERT INTO daily_notes (date, journal_text, reflection_text) VALUES (@date, @journal_text, @reflection_text)
       ON CONFLICT(date) DO UPDATE SET
         journal_text = COALESCE(@journal_text, daily_notes.journal_text),
         reflection_text = COALESCE(@reflection_text, daily_notes.reflection_text),
         updated_at = datetime('now')`
    )
    .run({
      date,
      journal_text: data.journal_text !== undefined ? data.journal_text : existing?.journal_text ?? null,
      reflection_text:
        data.reflection_text !== undefined ? data.reflection_text : existing?.reflection_text ?? null,
    });
  return getDailyNote(date)!;
}
