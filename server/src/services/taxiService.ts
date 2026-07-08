import { getDb } from '../db/connection.js';
import type { TaxiShift } from '../types/index.js';

export function getTaxiShifts(limit = 50): TaxiShift[] {
  return getDb().prepare('SELECT * FROM taxi_shifts ORDER BY shift_date DESC LIMIT ?').all(limit) as TaxiShift[];
}

export function getTaxiShiftById(id: number): TaxiShift | null {
  const row = getDb().prepare('SELECT * FROM taxi_shifts WHERE id = ?').get(id) as TaxiShift | undefined;
  return row ?? null;
}

export function createTaxiShift(data: {
  shift_date: string;
  shift_start?: string | null;
  shift_end?: string | null;
  hours_worked: number;
  shift_type?: string | null;
  income?: number | null;
  notes?: string | null;
}): TaxiShift {
  const result = getDb()
    .prepare(
      `INSERT INTO taxi_shifts (shift_date, shift_start, shift_end, hours_worked, shift_type, income, notes)
       VALUES (@shift_date, @shift_start, @shift_end, @hours_worked, @shift_type, @income, @notes)`
    )
    .run({
      shift_date: data.shift_date,
      shift_start: data.shift_start ?? null,
      shift_end: data.shift_end ?? null,
      hours_worked: data.hours_worked,
      shift_type: data.shift_type ?? null,
      income: data.income ?? null,
      notes: data.notes ?? null,
    });
  return getTaxiShiftById(Number(result.lastInsertRowid))!;
}

export function updateTaxiShift(
  id: number,
  data: Partial<{
    shift_date: string;
    shift_start: string | null;
    shift_end: string | null;
    hours_worked: number;
    shift_type: string | null;
    income: number | null;
    notes: string | null;
  }>
): TaxiShift | null {
  const existing = getTaxiShiftById(id);
  if (!existing) return null;

  getDb()
    .prepare(
      `UPDATE taxi_shifts SET shift_date = @shift_date, shift_start = @shift_start,
       shift_end = @shift_end, hours_worked = @hours_worked, shift_type = @shift_type,
       income = @income, notes = @notes WHERE id = @id`
    )
    .run({
      id,
      shift_date: data.shift_date ?? existing.shift_date,
      shift_start: data.shift_start !== undefined ? data.shift_start : existing.shift_start,
      shift_end: data.shift_end !== undefined ? data.shift_end : existing.shift_end,
      hours_worked: data.hours_worked ?? existing.hours_worked,
      shift_type: data.shift_type !== undefined ? data.shift_type : existing.shift_type,
      income: data.income !== undefined ? data.income : existing.income,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    });
  return getTaxiShiftById(id);
}

export function deleteTaxiShift(id: number): boolean {
  const result = getDb().prepare('DELETE FROM taxi_shifts WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getTaxiHoursForDate(dateIso: string): number {
  const row = getDb()
    .prepare(`SELECT COALESCE(SUM(hours_worked), 0) as total FROM taxi_shifts WHERE shift_date = ?`)
    .get(dateIso) as { total: number };
  return Math.round(row.total * 100) / 100;
}

export function getTaxiHoursSince(dateIso: string): number {
  const row = getDb()
    .prepare(`SELECT COALESCE(SUM(hours_worked), 0) as total FROM taxi_shifts WHERE shift_date >= ?`)
    .get(dateIso) as { total: number };
  return Math.round(row.total * 100) / 100;
}

export function getTaxiTrendSince(dateIso: string): { date: string; value: number }[] {
  return getDb()
    .prepare(
      `SELECT shift_date as date, SUM(hours_worked) as value FROM taxi_shifts
       WHERE shift_date >= ? GROUP BY shift_date ORDER BY shift_date ASC`
    )
    .all(dateIso) as { date: string; value: number }[];
}

export function getWeeklyTaxiHours(): number {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return getTaxiHoursSince(d.toISOString().slice(0, 10));
}

export function getMonthlyTaxiHours(): number {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return getTaxiHoursSince(d.toISOString().slice(0, 10));
}
