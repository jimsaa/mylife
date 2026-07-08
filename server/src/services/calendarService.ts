import { getDb } from '../db/connection.js';
import type { CalendarEvent } from '../types/index.js';

const SELECT_WITH_PROJECT = `
  SELECT ce.*, p.name as project_name
  FROM calendar_events ce
  LEFT JOIN projects p ON p.id = ce.project_id
`;

export function getCalendarEvents(start?: string, end?: string): CalendarEvent[] {
  if (start && end) {
    return getDb()
      .prepare(`${SELECT_WITH_PROJECT} WHERE ce.start_time >= ? AND ce.end_time <= ? ORDER BY ce.start_time`)
      .all(start, end) as CalendarEvent[];
  }
  return getDb().prepare(`${SELECT_WITH_PROJECT} ORDER BY ce.start_time DESC`).all() as CalendarEvent[];
}

export function getCalendarEventsForDate(dateIso: string): CalendarEvent[] {
  return getDb()
    .prepare(
      `${SELECT_WITH_PROJECT}
       WHERE date(ce.start_time) = ?
       ORDER BY ce.start_time ASC`
    )
    .all(dateIso) as CalendarEvent[];
}

export function getCalendarEventById(id: number): CalendarEvent | null {
  const row = getDb().prepare(`${SELECT_WITH_PROJECT} WHERE ce.id = ?`).get(id) as CalendarEvent | undefined;
  return row ?? null;
}

export function createCalendarEvent(data: {
  title: string;
  project_id?: number | null;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  color?: string | null;
  notes?: string | null;
}): CalendarEvent {
  const result = getDb()
    .prepare(
      `INSERT INTO calendar_events (title, project_id, start_time, end_time, all_day, color, notes)
       VALUES (@title, @project_id, @start_time, @end_time, @all_day, @color, @notes)`
    )
    .run({
      title: data.title,
      project_id: data.project_id ?? null,
      start_time: data.start_time,
      end_time: data.end_time,
      all_day: data.all_day ? 1 : 0,
      color: data.color ?? null,
      notes: data.notes ?? null,
    });
  return getCalendarEventById(Number(result.lastInsertRowid))!;
}

export function updateCalendarEvent(
  id: number,
  data: Partial<{
    title: string;
    project_id: number | null;
    start_time: string;
    end_time: string;
    all_day: boolean;
    color: string | null;
    notes: string | null;
  }>
): CalendarEvent | null {
  const existing = getCalendarEventById(id);
  if (!existing) return null;

  getDb()
    .prepare(
      `UPDATE calendar_events SET
        title = @title, project_id = @project_id, start_time = @start_time,
        end_time = @end_time, all_day = @all_day, color = @color, notes = @notes,
        updated_at = datetime('now')
       WHERE id = @id`
    )
    .run({
      id,
      title: data.title ?? existing.title,
      project_id: data.project_id !== undefined ? data.project_id : existing.project_id,
      start_time: data.start_time ?? existing.start_time,
      end_time: data.end_time ?? existing.end_time,
      all_day: data.all_day !== undefined ? (data.all_day ? 1 : 0) : existing.all_day,
      color: data.color !== undefined ? data.color : existing.color,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    });
  return getCalendarEventById(id);
}

export function deleteCalendarEvent(id: number): boolean {
  const result = getDb().prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getPlannedMinutesForDate(dateIso: string): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(
        (julianday(end_time) - julianday(start_time)) * 24 * 60
      ), 0) as mins
       FROM calendar_events WHERE date(start_time) = ? AND all_day = 0`
    )
    .get(dateIso) as { mins: number };
  return Math.round(row.mins);
}
