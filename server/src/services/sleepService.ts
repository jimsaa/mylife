import { getDb } from '../db/connection.js';
import type { SleepLog } from '../types/index.js';

export function getSleepLogs(limit = 30): SleepLog[] {
  return getDb().prepare('SELECT * FROM sleep_logs ORDER BY sleep_date DESC LIMIT ?').all(limit) as SleepLog[];
}

export function getSleepLogById(id: number): SleepLog | null {
  const row = getDb().prepare('SELECT * FROM sleep_logs WHERE id = ?').get(id) as SleepLog | undefined;
  return row ?? null;
}

export function createSleepLog(data: {
  sleep_date: string;
  hours_slept: number;
  quality?: number | null;
  notes?: string | null;
}): SleepLog {
  const result = getDb()
    .prepare(
      `INSERT INTO sleep_logs (sleep_date, hours_slept, quality, notes)
       VALUES (@sleep_date, @hours_slept, @quality, @notes)`
    )
    .run({
      sleep_date: data.sleep_date,
      hours_slept: data.hours_slept,
      quality: data.quality ?? null,
      notes: data.notes ?? null,
    });
  return getSleepLogById(Number(result.lastInsertRowid))!;
}

export function updateSleepLog(
  id: number,
  data: Partial<{ sleep_date: string; hours_slept: number; quality: number | null; notes: string | null }>
): SleepLog | null {
  const existing = getSleepLogById(id);
  if (!existing) return null;

  getDb()
    .prepare(
      `UPDATE sleep_logs SET sleep_date = @sleep_date, hours_slept = @hours_slept,
       quality = @quality, notes = @notes WHERE id = @id`
    )
    .run({
      id,
      sleep_date: data.sleep_date ?? existing.sleep_date,
      hours_slept: data.hours_slept ?? existing.hours_slept,
      quality: data.quality !== undefined ? data.quality : existing.quality,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    });
  return getSleepLogById(id);
}

export function deleteSleepLog(id: number): boolean {
  const result = getDb().prepare('DELETE FROM sleep_logs WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getAverageSleepSince(dateIso: string): number | null {
  const row = getDb()
    .prepare(`SELECT AVG(hours_slept) as avg FROM sleep_logs WHERE sleep_date >= ?`)
    .get(dateIso) as { avg: number | null };
  return row.avg !== null ? Math.round(row.avg * 10) / 10 : null;
}

export function getSleepTrendSince(dateIso: string): { date: string; value: number }[] {
  return getDb()
    .prepare(
      `SELECT sleep_date as date, hours_slept as value FROM sleep_logs
       WHERE sleep_date >= ? ORDER BY sleep_date ASC`
    )
    .all(dateIso) as { date: string; value: number }[];
}
