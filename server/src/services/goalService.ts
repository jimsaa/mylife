import { getDb } from '../db/connection.js';
import type { Goal } from '../types/index.js';

export function getGoals(includeCompleted = false): Goal[] {
  const sql = includeCompleted
    ? 'SELECT * FROM goals ORDER BY status ASC, target_date ASC'
    : "SELECT * FROM goals WHERE status != 'completed' AND status != 'abandoned' ORDER BY target_date ASC";
  return getDb().prepare(sql).all() as Goal[];
}

export function getGoalById(id: number): Goal | null {
  const row = getDb().prepare('SELECT * FROM goals WHERE id = ?').get(id) as Goal | undefined;
  return row ?? null;
}

export function createGoal(data: Partial<Goal>): Goal {
  const result = getDb()
    .prepare(
      `INSERT INTO goals (title, description, category, start_date, target_date, progress_percent, status)
       VALUES (@title, @description, @category, @start_date, @target_date, @progress_percent, @status)`
    )
    .run({
      title: data.title,
      description: data.description ?? null,
      category: data.category ?? null,
      start_date: data.start_date ?? null,
      target_date: data.target_date ?? null,
      progress_percent: data.progress_percent ?? 0,
      status: data.status ?? 'active',
    });
  return getGoalById(Number(result.lastInsertRowid))!;
}

export function updateGoal(id: number, data: Partial<Goal>): Goal | null {
  const existing = getGoalById(id);
  if (!existing) return null;

  getDb()
    .prepare(
      `UPDATE goals SET title = @title, description = @description, category = @category,
       start_date = @start_date, target_date = @target_date, progress_percent = @progress_percent,
       status = @status, updated_at = datetime('now') WHERE id = @id`
    )
    .run({
      id,
      title: data.title ?? existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      category: data.category !== undefined ? data.category : existing.category,
      start_date: data.start_date !== undefined ? data.start_date : existing.start_date,
      target_date: data.target_date !== undefined ? data.target_date : existing.target_date,
      progress_percent: data.progress_percent ?? existing.progress_percent,
      status: data.status ?? existing.status,
    });
  return getGoalById(id);
}

export function deleteGoal(id: number): boolean {
  const result = getDb().prepare('DELETE FROM goals WHERE id = ?').run(id);
  return result.changes > 0;
}
