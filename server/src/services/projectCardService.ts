import { getDb } from '../db/connection.js';
import {
  deleteProjectCardImage,
  saveProjectCardImage,
} from './projectCardImageService.js';

export interface ProjectCard {
  id: number;
  title: string;
  description: string | null;
  image_path: string;
  image_url: string;
  url: string;
  active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function withImageUrl(
  row: Omit<ProjectCard, 'image_url'>,
  imageBase = '/api/project-cards/image',
): ProjectCard {
  return {
    ...row,
    image_url: `${imageBase}/${row.id}`,
  };
}

function mapRow(
  row: Record<string, unknown>,
  imageBase = '/api/project-cards/image',
): ProjectCard {
  return withImageUrl(
    {
      id: row.id as number,
      title: row.title as string,
      description: (row.description as string | null) ?? null,
      image_path: row.image_path as string,
      url: row.url as string,
      active: row.active as number,
      sort_order: row.sort_order as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    },
    imageBase,
  );
}

export function listPublicProjectCards(): ProjectCard[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM project_cards
       WHERE active = 1
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map((row) => mapRow(row, '/api/project-cards/image'));
}

export function listAllProjectCards(): ProjectCard[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM project_cards
       ORDER BY sort_order ASC, created_at ASC`,
    )
    .all() as Array<Record<string, unknown>>;
  return rows.map((row) => mapRow(row, '/api/admin/project-cards/image'));
}

export function getProjectCardById(
  id: number,
  imageBase = '/api/admin/project-cards/image',
): ProjectCard | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM project_cards WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapRow(row, imageBase) : null;
}

export function createProjectCard(input: {
  title: string;
  description?: string | null;
  url: string;
  active?: boolean;
  sort_order?: number;
  image_base64: string;
  mime_type: string;
}): ProjectCard {
  const title = input.title.trim();
  const url = input.url.trim();
  if (!title) throw new Error('title is required');
  if (!url) throw new Error('url is required');
  if (!input.image_base64 || !input.mime_type) {
    throw new Error('image_base64 and mime_type are required');
  }

  const imagePath = saveProjectCardImage(input.image_base64, input.mime_type);
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO project_cards (title, description, image_path, url, active, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      title,
      input.description?.trim() || null,
      imagePath,
      url,
      input.active === false ? 0 : 1,
      input.sort_order ?? 0,
    );

  return getProjectCardById(Number(result.lastInsertRowid))!;
}

export function updateProjectCard(
  id: number,
  input: {
    title?: string;
    description?: string | null;
    url?: string;
    active?: boolean;
    sort_order?: number;
    image_base64?: string;
    mime_type?: string;
  },
): ProjectCard | null {
  const existing = getProjectCardById(id);
  if (!existing) return null;

  let imagePath = existing.image_path;
  if (input.image_base64 && input.mime_type) {
    const nextPath = saveProjectCardImage(input.image_base64, input.mime_type);
    deleteProjectCardImage(existing.image_path);
    imagePath = nextPath;
  }

  const db = getDb();
  db.prepare(
    `UPDATE project_cards SET
      title = ?,
      description = ?,
      image_path = ?,
      url = ?,
      active = ?,
      sort_order = ?,
      updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    input.title !== undefined ? input.title.trim() : existing.title,
    input.description !== undefined
      ? input.description?.trim() || null
      : existing.description,
    imagePath,
    input.url !== undefined ? input.url.trim() : existing.url,
    input.active !== undefined ? (input.active ? 1 : 0) : existing.active,
    input.sort_order !== undefined ? input.sort_order : existing.sort_order,
    id,
  );

  return getProjectCardById(id);
}

export function deleteProjectCard(id: number): boolean {
  const existing = getProjectCardById(id);
  if (!existing) return false;

  const db = getDb();
  const result = db.prepare('DELETE FROM project_cards WHERE id = ?').run(id);
  if (result.changes > 0) {
    deleteProjectCardImage(existing.image_path);
  }
  return result.changes > 0;
}
