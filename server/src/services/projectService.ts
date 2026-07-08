import { getDb } from '../db/connection.js';
import type { Project } from '../types/index.js';
import { daysAgoIso } from './utils.js';

function enrichProject(project: Project): Project {
  const db = getDb();
  const total = db
    .prepare(
      `SELECT COALESCE(SUM(duration_minutes), 0) as mins FROM time_entries WHERE project_id = ? AND end_time IS NOT NULL`
    )
    .get(project.id) as { mins: number };

  const last7 = db
    .prepare(
      `SELECT COALESCE(SUM(duration_minutes), 0) as mins FROM time_entries
       WHERE project_id = ? AND end_time IS NOT NULL AND date(start_time) >= ?`
    )
    .get(project.id, daysAgoIso(7)) as { mins: number };

  const last30 = db
    .prepare(
      `SELECT COALESCE(SUM(duration_minutes), 0) as mins FROM time_entries
       WHERE project_id = ? AND end_time IS NOT NULL AND date(start_time) >= ?`
    )
    .get(project.id, daysAgoIso(30)) as { mins: number };

  return {
    ...project,
    total_hours: Math.round((total.mins / 60) * 100) / 100,
    hours_last_7_days: Math.round((last7.mins / 60) * 100) / 100,
    hours_last_30_days: Math.round((last30.mins / 60) * 100) / 100,
  };
}

export function getProjects(includeArchived = false): Project[] {
  const sql = includeArchived
    ? 'SELECT * FROM projects ORDER BY status ASC, priority ASC, name ASC'
    : "SELECT * FROM projects WHERE status != 'archived' ORDER BY priority ASC, name ASC";
  const rows = getDb().prepare(sql).all() as Project[];
  return rows.map(enrichProject);
}

export function getProjectById(id: number): Project | null {
  const row = getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
  return row ? enrichProject(row) : null;
}

export function getProjectByName(name: string): Project | null {
  const row = getDb().prepare('SELECT * FROM projects WHERE name = ?').get(name) as Project | undefined;
  return row ? enrichProject(row) : null;
}

export function createProject(data: Partial<Project>): Project {
  const result = getDb()
    .prepare(
      `INSERT INTO projects (name, status, priority, goal, description, notes, roi_rating, color, last_activity_at)
       VALUES (@name, @status, @priority, @goal, @description, @notes, @roi_rating, @color, datetime('now'))`
    )
    .run({
      name: data.name,
      status: data.status ?? 'active',
      priority: data.priority ?? 3,
      goal: data.goal ?? null,
      description: data.description ?? null,
      notes: data.notes ?? null,
      roi_rating: data.roi_rating ?? null,
      color: data.color ?? '#6B7280',
    });
  return getProjectById(Number(result.lastInsertRowid))!;
}

export function updateProject(id: number, data: Partial<Project>): Project | null {
  const existing = getProjectById(id);
  if (!existing) return null;

  getDb()
    .prepare(
      `UPDATE projects SET
        name = @name, status = @status, priority = @priority, goal = @goal,
        description = @description, notes = @notes, roi_rating = @roi_rating,
        color = @color, updated_at = datetime('now')
       WHERE id = @id`
    )
    .run({
      id,
      name: data.name ?? existing.name,
      status: data.status ?? existing.status,
      priority: data.priority ?? existing.priority,
      goal: data.goal !== undefined ? data.goal : existing.goal,
      description: data.description !== undefined ? data.description : existing.description,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      roi_rating: data.roi_rating !== undefined ? data.roi_rating : existing.roi_rating,
      color: data.color ?? existing.color,
    });
  return getProjectById(id);
}

export function touchProjectActivity(projectId: number): void {
  getDb()
    .prepare(`UPDATE projects SET last_activity_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
    .run(projectId);
}

export function archiveProject(id: number): Project | null {
  return updateProject(id, { status: 'archived' });
}

export function deleteProject(id: number): boolean {
  const result = getDb().prepare('DELETE FROM projects WHERE id = ?').run(id);
  return result.changes > 0;
}
