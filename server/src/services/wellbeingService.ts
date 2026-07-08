import { getDb } from '../db/connection.js';
import type { DailyWellbeing } from '../types/index.js';

export function getDailyWellbeing(date: string): DailyWellbeing | null {
  const row = getDb().prepare('SELECT * FROM daily_wellbeing WHERE date = ?').get(date) as DailyWellbeing | undefined;
  return row ?? null;
}

export function getWellbeingHistory(limit = 30): DailyWellbeing[] {
  return getDb()
    .prepare('SELECT * FROM daily_wellbeing ORDER BY date DESC LIMIT ?')
    .all(limit) as DailyWellbeing[];
}

export function upsertDailyWellbeing(
  date: string,
  data: {
    energy_level?: number | null;
    mood_level?: number | null;
    stress_level?: number | null;
    notes?: string | null;
  }
): DailyWellbeing {
  const existing = getDailyWellbeing(date);
  getDb()
    .prepare(
      `INSERT INTO daily_wellbeing (date, energy_level, mood_level, stress_level, notes)
       VALUES (@date, @energy_level, @mood_level, @stress_level, @notes)
       ON CONFLICT(date) DO UPDATE SET
         energy_level = COALESCE(@energy_level, daily_wellbeing.energy_level),
         mood_level = COALESCE(@mood_level, daily_wellbeing.mood_level),
         stress_level = COALESCE(@stress_level, daily_wellbeing.stress_level),
         notes = COALESCE(@notes, daily_wellbeing.notes),
         updated_at = datetime('now')`
    )
    .run({
      date,
      energy_level: data.energy_level !== undefined ? data.energy_level : existing?.energy_level ?? null,
      mood_level: data.mood_level !== undefined ? data.mood_level : existing?.mood_level ?? null,
      stress_level: data.stress_level !== undefined ? data.stress_level : existing?.stress_level ?? null,
      notes: data.notes !== undefined ? data.notes : existing?.notes ?? null,
    });
  return getDailyWellbeing(date)!;
}

export function getAverageEnergySince(dateIso: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT AVG(energy_level) as avg FROM daily_wellbeing
       WHERE date >= ? AND energy_level IS NOT NULL`
    )
    .get(dateIso) as { avg: number | null };
  return row.avg !== null ? Math.round(row.avg * 10) / 10 : null;
}

export function getAverageMoodSince(dateIso: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT AVG(mood_level) as avg FROM daily_wellbeing
       WHERE date >= ? AND mood_level IS NOT NULL`
    )
    .get(dateIso) as { avg: number | null };
  return row.avg !== null ? Math.round(row.avg * 10) / 10 : null;
}
