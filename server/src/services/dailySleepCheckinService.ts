import { getDb } from '../db/connection.js';
import { calculateDailySleepCheckinReadiness } from '../modules/sleep-checkin/morningReadiness.js';
import type { DailySleepCheckin, DailySleepCheckinInput } from '../types/index.js';
import { todayIso } from './utils.js';

export interface SaveDailySleepCheckinPayload {
  date?: string;
  sleep_score: number;
  actual_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  morning_energy: number;
}

function validatePayload(payload: SaveDailySleepCheckinPayload): string | null {
  if (payload.sleep_score < 0 || payload.sleep_score > 100) {
    return 'sleep_score must be between 0 and 100';
  }
  if (payload.actual_sleep_minutes < 0) return 'actual_sleep_minutes must be non-negative';
  if (payload.deep_sleep_minutes < 0) return 'deep_sleep_minutes must be non-negative';
  if (payload.rem_sleep_minutes < 0) return 'rem_sleep_minutes must be non-negative';
  if (payload.morning_energy < 1 || payload.morning_energy > 5) {
    return 'morning_energy must be between 1 and 5';
  }
  return null;
}

export function getDailySleepCheckinByDate(date: string): DailySleepCheckin | null {
  const row = getDb()
    .prepare('SELECT * FROM daily_sleep_checkins WHERE date = ?')
    .get(date) as DailySleepCheckin | undefined;
  return row ?? null;
}

export function getDailySleepCheckinById(id: number): DailySleepCheckin | null {
  const row = getDb()
    .prepare('SELECT * FROM daily_sleep_checkins WHERE id = ?')
    .get(id) as DailySleepCheckin | undefined;
  return row ?? null;
}

export function listDailySleepCheckins(limit = 30): DailySleepCheckin[] {
  return getDb()
    .prepare('SELECT * FROM daily_sleep_checkins ORDER BY date DESC LIMIT ?')
    .all(limit) as DailySleepCheckin[];
}

export function getAverageSleepScoreSince(dateIso: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT AVG(sleep_score) as avg FROM daily_sleep_checkins
       WHERE date >= ?`
    )
    .get(dateIso) as { avg: number | null };
  return row.avg !== null ? Math.round(row.avg * 10) / 10 : null;
}

export function getAverageMorningEnergySince(dateIso: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT AVG(morning_energy) as avg FROM daily_sleep_checkins
       WHERE date >= ?`
    )
    .get(dateIso) as { avg: number | null };
  return row.avg !== null ? Math.round(row.avg * 10) / 10 : null;
}

export function upsertDailySleepCheckin(payload: SaveDailySleepCheckinPayload): {
  checkin: DailySleepCheckin;
  readiness: ReturnType<typeof calculateDailySleepCheckinReadiness>;
} {
  const date = payload.date ?? todayIso();
  const existing = getDailySleepCheckinByDate(date);
  if (existing) {
    return updateDailySleepCheckin(existing.id, payload);
  }
  return createDailySleepCheckin(payload);
}

export function createDailySleepCheckin(payload: SaveDailySleepCheckinPayload): {
  checkin: DailySleepCheckin;
  readiness: ReturnType<typeof calculateDailySleepCheckinReadiness>;
} {
  const error = validatePayload(payload);
  if (error) throw new Error(error);

  const date = payload.date ?? todayIso();
  const existing = getDailySleepCheckinByDate(date);
  if (existing) {
    const err = new Error('duplicate') as Error & { existing: DailySleepCheckin };
    err.existing = existing;
    throw err;
  }

  const readiness = calculateDailySleepCheckinReadiness(payload);

  const result = getDb()
    .prepare(
      `INSERT INTO daily_sleep_checkins (
        date, sleep_score, actual_sleep_minutes, deep_sleep_minutes,
        rem_sleep_minutes, morning_energy, morning_readiness_score, morning_readiness_label
      ) VALUES (
        @date, @sleep_score, @actual_sleep_minutes, @deep_sleep_minutes,
        @rem_sleep_minutes, @morning_energy, @morning_readiness_score, @morning_readiness_label
      )`
    )
    .run({
      date,
      sleep_score: payload.sleep_score,
      actual_sleep_minutes: payload.actual_sleep_minutes,
      deep_sleep_minutes: payload.deep_sleep_minutes,
      rem_sleep_minutes: payload.rem_sleep_minutes,
      morning_energy: payload.morning_energy,
      morning_readiness_score: readiness.score,
      morning_readiness_label: readiness.label,
    });

  const checkin = getDailySleepCheckinById(Number(result.lastInsertRowid))!;
  return { checkin, readiness };
}

export function updateDailySleepCheckin(
  id: number,
  payload: SaveDailySleepCheckinPayload
): {
  checkin: DailySleepCheckin;
  readiness: ReturnType<typeof calculateDailySleepCheckinReadiness>;
} {
  const error = validatePayload(payload);
  if (error) throw new Error(error);

  const existing = getDailySleepCheckinById(id);
  if (!existing) throw new Error('not_found');

  const date = payload.date ?? existing.date;
  const readiness = calculateDailySleepCheckinReadiness(payload);

  getDb()
    .prepare(
      `UPDATE daily_sleep_checkins SET
        date = @date,
        sleep_score = @sleep_score,
        actual_sleep_minutes = @actual_sleep_minutes,
        deep_sleep_minutes = @deep_sleep_minutes,
        rem_sleep_minutes = @rem_sleep_minutes,
        morning_energy = @morning_energy,
        morning_readiness_score = @morning_readiness_score,
        morning_readiness_label = @morning_readiness_label,
        updated_at = datetime('now')
      WHERE id = @id`
    )
    .run({
      id,
      date,
      sleep_score: payload.sleep_score,
      actual_sleep_minutes: payload.actual_sleep_minutes,
      deep_sleep_minutes: payload.deep_sleep_minutes,
      rem_sleep_minutes: payload.rem_sleep_minutes,
      morning_energy: payload.morning_energy,
      morning_readiness_score: readiness.score,
      morning_readiness_label: readiness.label,
    });

  const checkin = getDailySleepCheckinById(id)!;
  return { checkin, readiness };
}

export type { DailySleepCheckinInput };
