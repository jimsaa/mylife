import { getDb } from '../db/connection.js';
import type { TimeEntry } from '../types/index.js';
import { minutesBetween } from './utils.js';
import { touchProjectActivity } from './projectService.js';

const SELECT_WITH_PROJECT = `
  SELECT te.*, p.name as project_name, p.color as project_color
  FROM time_entries te
  LEFT JOIN projects p ON p.id = te.project_id
`;

export function getTimeEntries(limit = 100): TimeEntry[] {
  return getDb()
    .prepare(`${SELECT_WITH_PROJECT} ORDER BY te.start_time DESC LIMIT ?`)
    .all(limit) as TimeEntry[];
}

export function getTimeEntriesByDate(date: string): TimeEntry[] {
  return getDb()
    .prepare(`${SELECT_WITH_PROJECT} WHERE date(te.start_time) = ? ORDER BY te.start_time DESC`)
    .all(date) as TimeEntry[];
}

export function getTimeEntryById(id: number): TimeEntry | null {
  const row = getDb().prepare(`${SELECT_WITH_PROJECT} WHERE te.id = ?`).get(id) as TimeEntry | undefined;
  return row ?? null;
}

export function getRunningTimeEntry(): TimeEntry | null {
  const row = getDb()
    .prepare(`${SELECT_WITH_PROJECT} WHERE te.end_time IS NULL ORDER BY te.start_time DESC LIMIT 1`)
    .get() as TimeEntry | undefined;
  return row ?? null;
}

export function createTimeEntry(data: {
  project_id?: number | null;
  calendar_event_id?: number | null;
  start_time: string;
  end_time?: string | null;
  duration_minutes?: number | null;
  notes?: string | null;
  is_manual?: boolean;
}): TimeEntry {
  let duration = data.duration_minutes ?? null;
  if (data.end_time && !duration) {
    duration = minutesBetween(data.start_time, data.end_time);
  }

  const result = getDb()
    .prepare(
      `INSERT INTO time_entries (project_id, calendar_event_id, start_time, end_time, duration_minutes, notes, is_manual)
       VALUES (@project_id, @calendar_event_id, @start_time, @end_time, @duration_minutes, @notes, @is_manual)`
    )
    .run({
      project_id: data.project_id ?? null,
      calendar_event_id: data.calendar_event_id ?? null,
      start_time: data.start_time,
      end_time: data.end_time ?? null,
      duration_minutes: duration,
      notes: data.notes ?? null,
      is_manual: data.is_manual ? 1 : 0,
    });

  if (data.project_id) touchProjectActivity(data.project_id);
  return getTimeEntryById(Number(result.lastInsertRowid))!;
}

export function updateTimeEntry(
  id: number,
  data: Partial<{
    project_id: number | null;
    start_time: string;
    end_time: string | null;
    duration_minutes: number | null;
    notes: string | null;
  }>
): TimeEntry | null {
  const existing = getTimeEntryById(id);
  if (!existing) return null;

  const start_time = data.start_time ?? existing.start_time;
  const end_time = data.end_time !== undefined ? data.end_time : existing.end_time;
  let duration = data.duration_minutes !== undefined ? data.duration_minutes : existing.duration_minutes;
  if (end_time && duration === null) {
    duration = minutesBetween(start_time, end_time);
  }

  getDb()
    .prepare(
      `UPDATE time_entries SET
        project_id = @project_id, start_time = @start_time, end_time = @end_time,
        duration_minutes = @duration_minutes, notes = @notes
       WHERE id = @id`
    )
    .run({
      id,
      project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
      start_time,
      end_time,
      duration_minutes: duration,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    });

  const updated = getTimeEntryById(id)!;
  if (updated.project_id) touchProjectActivity(updated.project_id);
  return updated;
}

export function stopTimeEntry(id: number, endTime?: string): TimeEntry | null {
  const existing = getTimeEntryById(id);
  if (!existing || existing.end_time) return null;
  const end_time = endTime ?? new Date().toISOString();
  return updateTimeEntry(id, { end_time, duration_minutes: minutesBetween(existing.start_time, end_time) });
}

export function deleteTimeEntry(id: number): boolean {
  const result = getDb().prepare('DELETE FROM time_entries WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getTotalMinutesSince(dateIso: string, projectIds?: number[]): number {
  let sql = `SELECT COALESCE(SUM(duration_minutes), 0) as mins FROM time_entries
             WHERE end_time IS NOT NULL AND date(start_time) >= ?`;
  const params: (string | number)[] = [dateIso];
  if (projectIds?.length) {
    sql += ` AND project_id IN (${projectIds.map(() => '?').join(',')})`;
    params.push(...projectIds);
  }
  const row = getDb().prepare(sql).get(...params) as { mins: number };
  return row.mins;
}

export function getTotalMinutesForDate(dateIso: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(duration_minutes), 0) as mins FROM time_entries
       WHERE end_time IS NOT NULL AND date(start_time) = ?`
    )
    .get(dateIso) as { mins: number };
  return row.mins;
}
