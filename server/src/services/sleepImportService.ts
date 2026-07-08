import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from '../db/connection.js';
import { createSleepLog } from './sleepService.js';
import { minutesToHoursDecimal } from '../modules/sleep-import/parsers.js';
import {
  buildSessionDbParams,
  SESSION_COLUMNS,
  SESSION_PLACEHOLDERS,
  SESSION_UPDATE_SET,
} from './sleepSessionDb.js';
import type {
  DuplicateMatch,
  SaveSleepImportPayload,
  SleepImportRecord,
  SleepMetricInput,
  SleepSessionInput,
  SleepSessionRecord,
} from '../modules/sleep-import/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../../data/sleep-screenshots');

function ensureScreenshotDir(): void {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

function mapSession(row: Record<string, unknown>, metrics: SleepMetricInput[] = []): SleepSessionRecord {
  return {
    id: row.id as number,
    source: (row.source as string | null) ?? null,
    date: row.date as string,
    bedtime: (row.bedtime as string | null) ?? null,
    wake_time: (row.wake_time as string | null) ?? null,
    time_in_bed_minutes: (row.time_in_bed_minutes as number | null) ?? null,
    actual_sleep_minutes: (row.actual_sleep_minutes as number | null) ?? null,
    sleep_score: (row.sleep_score as number | null) ?? null,
    overall_rating: (row.overall_rating as string | null) ?? null,
    deep_sleep_minutes: (row.deep_sleep_minutes as number | null) ?? null,
    deep_sleep_rating: (row.deep_sleep_rating as string | null) ?? null,
    rem_sleep_minutes: (row.rem_sleep_minutes as number | null) ?? null,
    rem_sleep_rating: (row.rem_sleep_rating as string | null) ?? null,
    light_sleep_minutes: (row.light_sleep_minutes as number | null) ?? null,
    awake_minutes: (row.awake_minutes as number | null) ?? null,
    awake_percent: (row.awake_percent as number | null) ?? null,
    rem_percent: (row.rem_percent as number | null) ?? null,
    light_percent: (row.light_percent as number | null) ?? null,
    deep_percent: (row.deep_percent as number | null) ?? null,
    morning_readiness_score: (row.morning_readiness_score as number | null) ?? null,
    morning_readiness_label: (row.morning_readiness_label as string | null) ?? null,
    sleep_efficiency_percent: (row.sleep_efficiency_percent as number | null) ?? null,
    sleep_spo2_percent: (row.sleep_spo2_percent as number | null) ?? null,
    snoring_minutes: (row.snoring_minutes as number | null) ?? null,
    snoring_detected:
      row.snoring_detected === null || row.snoring_detected === undefined
        ? null
        : Boolean(row.snoring_detected),
    sleep_avg_heart_rate: (row.sleep_avg_heart_rate as number | null) ?? null,
    sleep_min_heart_rate: (row.sleep_min_heart_rate as number | null) ?? null,
    sleep_max_heart_rate: (row.sleep_max_heart_rate as number | null) ?? null,
    actual_sleep_rating: (row.actual_sleep_rating as string | null) ?? null,
    rem_rating: (row.rem_rating as string | null) ?? null,
    restfulness_rating: (row.restfulness_rating as string | null) ?? null,
    sleep_latency_rating: (row.sleep_latency_rating as string | null) ?? null,
    sleep_spo2_min: (row.sleep_spo2_min as number | null) ?? null,
    sleep_spo2_avg: (row.sleep_spo2_avg as number | null) ?? null,
    sleep_spo2_max: (row.sleep_spo2_max as number | null) ?? null,
    blood_oxygen_graph_detected:
      row.blood_oxygen_graph_detected === null || row.blood_oxygen_graph_detected === undefined
        ? null
        : Boolean(row.blood_oxygen_graph_detected),
    imported_at: row.imported_at as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    unknown_metrics: metrics,
  };
}

function getMetricsForSession(sessionId: number): SleepMetricInput[] {
  return getDb()
    .prepare(
      `SELECT metric_name, metric_value, metric_unit, original_label
       FROM sleep_metrics WHERE sleep_session_id = ? ORDER BY id ASC`
    )
    .all(sessionId) as SleepMetricInput[];
}

export function getSleepSessions(limit = 50): SleepSessionRecord[] {
  const rows = getDb()
    .prepare('SELECT * FROM sleep_sessions ORDER BY date DESC, id DESC LIMIT ?')
    .all(limit) as Record<string, unknown>[];

  return rows.map((row) => mapSession(row, getMetricsForSession(row.id as number)));
}

export function getSleepSessionById(id: number): SleepSessionRecord | null {
  const row = getDb().prepare('SELECT * FROM sleep_sessions WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapSession(row, getMetricsForSession(id)) : null;
}

export function findDuplicateSessions(
  date: string,
  bedtime?: string | null,
  wake_time?: string | null
): DuplicateMatch[] {
  const db = getDb();
  const matches: DuplicateMatch[] = [];

  const sameDate = db
    .prepare('SELECT * FROM sleep_sessions WHERE date = ? ORDER BY id DESC')
    .all(date) as Record<string, unknown>[];

  for (const row of sameDate) {
    const session = mapSession(row, getMetricsForSession(row.id as number));
    if (bedtime && wake_time && session.bedtime === bedtime && session.wake_time === wake_time) {
      matches.push({ session, match_reason: 'date_bedtime_wake_time' });
      continue;
    }
    if (bedtime && session.bedtime === bedtime) {
      matches.push({ session, match_reason: 'date_bedtime' });
      continue;
    }
    if (wake_time && session.wake_time === wake_time) {
      matches.push({ session, match_reason: 'date_wake_time' });
      continue;
    }
    if (!bedtime && !wake_time) {
      matches.push({ session, match_reason: 'date_only' });
    }
  }

  return matches;
}

function saveScreenshot(filename: string | null | undefined, screenshotBase64?: string | null): string | null {
  if (!screenshotBase64) return null;
  ensureScreenshotDir();
  const safeName = (filename ?? 'screenshot.png').replace(/[^a-zA-Z0-9._-]/g, '_');
  const target = path.join(SCREENSHOT_DIR, `${Date.now()}-${safeName}`);
  fs.writeFileSync(target, Buffer.from(screenshotBase64, 'base64'));
  return target;
}

function saveScreenshots(
  filename: string | null | undefined,
  screenshotBase64?: string | null,
  screenshots?: Array<{ filename?: string | null; image_base64: string }> | null
): string | null {
  if (screenshots?.length) {
    const savedPaths = screenshots
      .map((shot, index) =>
        saveScreenshot(shot.filename ?? `screenshot-${index + 1}.png`, shot.image_base64)
      )
      .filter(Boolean) as string[];
    return savedPaths.length ? savedPaths.join(';') : null;
  }
  return saveScreenshot(filename, screenshotBase64);
}

function replaceMetrics(sessionId: number, metrics: SleepMetricInput[] = []): void {
  const db = getDb();
  db.prepare('DELETE FROM sleep_metrics WHERE sleep_session_id = ?').run(sessionId);
  const insert = db.prepare(`
    INSERT INTO sleep_metrics (sleep_session_id, metric_name, metric_value, metric_unit, original_label)
    VALUES (@sleep_session_id, @metric_name, @metric_value, @metric_unit, @original_label)
  `);
  for (const metric of metrics) {
    insert.run({ sleep_session_id: sessionId, ...metric });
  }
}

function insertSession(session: SleepSessionInput): number {
  const result = getDb()
    .prepare(`INSERT INTO sleep_sessions (${SESSION_COLUMNS}) VALUES (${SESSION_PLACEHOLDERS})`)
    .run(buildSessionDbParams(session));
  return Number(result.lastInsertRowid);
}

function updateSession(id: number, session: SleepSessionInput): void {
  getDb()
    .prepare(`UPDATE sleep_sessions SET ${SESSION_UPDATE_SET} WHERE id = @id`)
    .run(buildSessionDbParams(session, id));
}

function syncLegacySleepLog(session: SleepSessionInput): void {
  const minutes = session.actual_sleep_minutes ?? session.time_in_bed_minutes;
  const hours = minutesToHoursDecimal(minutes);
  if (!hours) return;

  createSleepLog({
    sleep_date: session.date,
    hours_slept: hours,
    quality: session.sleep_score ? Math.min(5, Math.max(1, Math.round(session.sleep_score / 20))) : null,
    notes: session.source ? `Importerad från ${session.source}` : 'Importerad sömnsession',
  });
}

function createImportRecord(
  sessionId: number,
  payload: SaveSleepImportPayload,
  screenshotPath: string | null
): SleepImportRecord {
  const result = getDb()
    .prepare(
      `INSERT INTO sleep_imports (
        sleep_session_id, filename, source, extraction_method, extraction_confidence,
        screenshot_path, screenshot_type, field_confidences_json, extraction_flags_json, pipeline_version
      ) VALUES (
        @sleep_session_id, @filename, @source, @extraction_method, @extraction_confidence,
        @screenshot_path, @screenshot_type, @field_confidences_json, @extraction_flags_json, @pipeline_version
      )`
    )
    .run({
      sleep_session_id: sessionId,
      filename: payload.filename ?? null,
      source: payload.session.source ?? null,
      extraction_method: payload.extraction_method ?? null,
      extraction_confidence: payload.extraction_confidence ?? null,
      screenshot_path: screenshotPath,
      screenshot_type: payload.screenshot_type ?? null,
      field_confidences_json: payload.field_confidences_json ?? null,
      extraction_flags_json: payload.extraction_flags_json ?? null,
      pipeline_version: payload.pipeline_version ?? null,
    });

  return getDb()
    .prepare('SELECT * FROM sleep_imports WHERE id = ?')
    .get(result.lastInsertRowid) as SleepImportRecord;
}

export function saveSleepImport(payload: SaveSleepImportPayload): {
  session: SleepSessionRecord;
  import_record: SleepImportRecord;
} {
  if (!payload.session.date) {
    throw new Error('date is required');
  }

  if (payload.duplicate_action === 'cancel') {
    throw new Error('Import cancelled by user');
  }

  const screenshotPath = saveScreenshots(payload.filename, payload.screenshot_base64, payload.screenshots);
  let sessionId: number;

  if (payload.duplicate_action === 'update' && payload.existing_session_id) {
    updateSession(payload.existing_session_id, payload.session);
    replaceMetrics(payload.existing_session_id, payload.session.unknown_metrics ?? []);
    sessionId = payload.existing_session_id;
  } else {
    sessionId = insertSession(payload.session);
    replaceMetrics(sessionId, payload.session.unknown_metrics ?? []);
    syncLegacySleepLog(payload.session);
  }

  const importRecord = createImportRecord(sessionId, payload, screenshotPath);
  const session = getSleepSessionById(sessionId)!;
  return { session, import_record: importRecord };
}

export function getSleepImportHistory(limit = 30): SleepImportRecord[] {
  return getDb()
    .prepare('SELECT * FROM sleep_imports ORDER BY imported_at DESC LIMIT ?')
    .all(limit) as SleepImportRecord[];
}
