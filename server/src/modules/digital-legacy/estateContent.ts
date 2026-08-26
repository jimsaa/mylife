import { getDb } from '../../db/connection.js';
import { writeAudit } from './audit.js';
import { DEFAULT_INSTRUCTION_SECTIONS } from './defaultInstructions.js';

export interface LegacyWelcomeMessage {
  id: number;
  title: string;
  body: string;
  updated_at: string;
}

export interface LegacyInstructionSection {
  id: number;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Seed default instruction sections once (idempotent). */
export function ensureInstructionDefaults(): void {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM legacy_instruction_sections')
    .get() as { c: number };
  if (row.c > 0) return;

  const insert = db.prepare(
    `INSERT INTO legacy_instruction_sections (title, body, sort_order)
     VALUES (?, ?, ?)`,
  );
  const tx = db.transaction(() => {
    for (const section of DEFAULT_INSTRUCTION_SECTIONS) {
      insert.run(section.title, section.body, section.sort_order);
    }
  });
  tx();
}

export function getWelcomeMessage(): LegacyWelcomeMessage {
  const db = getDb();
  return db.prepare('SELECT * FROM legacy_welcome_message WHERE id = 1').get() as LegacyWelcomeMessage;
}

export function updateWelcomeMessage(
  input: { title?: string; body?: string },
  actor = 'admin',
): LegacyWelcomeMessage {
  const current = getWelcomeMessage();
  const db = getDb();
  db.prepare(
    `UPDATE legacy_welcome_message SET
      title = ?,
      body = ?,
      updated_at = datetime('now')
     WHERE id = 1`,
  ).run(input.title?.trim() || current.title, input.body ?? current.body);

  writeAudit({ action: 'welcome_message_updated', actor });
  return getWelcomeMessage();
}

export function listInstructionSections(): LegacyInstructionSection[] {
  ensureInstructionDefaults();
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM legacy_instruction_sections
       ORDER BY sort_order ASC, id ASC`,
    )
    .all() as LegacyInstructionSection[];
}

export function getInstructionSection(id: number): LegacyInstructionSection | null {
  const db = getDb();
  return (
    (db
      .prepare('SELECT * FROM legacy_instruction_sections WHERE id = ?')
      .get(id) as LegacyInstructionSection | undefined) ?? null
  );
}

export function createInstructionSection(input: {
  title: string;
  body?: string;
  sort_order?: number;
}): LegacyInstructionSection {
  const db = getDb();
  const max = db
    .prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM legacy_instruction_sections')
    .get() as { m: number };
  const sortOrder = input.sort_order ?? max.m + 1;
  const result = db
    .prepare(
      `INSERT INTO legacy_instruction_sections (title, body, sort_order)
       VALUES (?, ?, ?)`,
    )
    .run(input.title.trim(), input.body ?? '', sortOrder);

  writeAudit({
    action: 'instruction_section_created',
    actor: 'admin',
    detail: { id: Number(result.lastInsertRowid), title: input.title },
  });

  return getInstructionSection(Number(result.lastInsertRowid))!;
}

export function updateInstructionSection(
  id: number,
  input: Partial<{ title: string; body: string; sort_order: number }>,
): LegacyInstructionSection | null {
  const existing = getInstructionSection(id);
  if (!existing) return null;

  const db = getDb();
  db.prepare(
    `UPDATE legacy_instruction_sections SET
      title = ?,
      body = ?,
      sort_order = ?,
      updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    input.title?.trim() ?? existing.title,
    input.body !== undefined ? input.body : existing.body,
    input.sort_order ?? existing.sort_order,
    id,
  );

  writeAudit({
    action: 'instruction_section_updated',
    actor: 'admin',
    detail: { id },
  });

  return getInstructionSection(id);
}

export function deleteInstructionSection(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM legacy_instruction_sections WHERE id = ?').run(id);
  if (result.changes > 0) {
    writeAudit({ action: 'instruction_section_deleted', actor: 'admin', detail: { id } });
  }
  return result.changes > 0;
}

export function reorderInstructionSections(orderedIds: number[]): LegacyInstructionSection[] {
  const db = getDb();
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      db.prepare(
        `UPDATE legacy_instruction_sections SET sort_order = ?, updated_at = datetime('now') WHERE id = ?`,
      ).run(index + 1, id);
    });
  });
  tx();
  writeAudit({
    action: 'instruction_sections_reordered',
    actor: 'admin',
    detail: { orderedIds },
  });
  return listInstructionSections();
}

export function getAccessIntroState(accessId: number): {
  legacy_intro_completed: boolean;
  contact_id: number;
  role: string;
} | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, contact_id, role, legacy_intro_completed
       FROM legacy_access WHERE id = ? AND enabled = 1`,
    )
    .get(accessId) as
    | {
        id: number;
        contact_id: number;
        role: string;
        legacy_intro_completed: number;
      }
    | undefined;
  if (!row) return null;
  return {
    contact_id: row.contact_id,
    role: row.role,
    legacy_intro_completed: row.legacy_intro_completed === 1,
  };
}

export function completeLegacyIntro(
  accessId: number,
  ip?: string | null,
): { ok: true } | { ok: false; error: string } {
  const db = getDb();
  const access = db
    .prepare('SELECT id, contact_id FROM legacy_access WHERE id = ? AND enabled = 1')
    .get(accessId) as { id: number; contact_id: number } | undefined;

  if (!access) return { ok: false, error: 'not_found' };

  db.prepare(
    `UPDATE legacy_access SET legacy_intro_completed = 1 WHERE id = ?`,
  ).run(accessId);

  writeAudit({
    action: 'legacy_intro_completed',
    actor: 'legacy_contact',
    contactId: access.contact_id,
    ipAddress: ip,
  });

  return { ok: true };
}
