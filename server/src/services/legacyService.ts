import { getDb } from '../db/connection.js';
import { writeAudit } from '../modules/digital-legacy/audit.js';
import {
  generateOneTimeToken,
  getTokenSigningSecret,
  hashPassword,
  hashToken,
  signUrlToken,
  verifyPassword,
  verifySignedUrlToken,
} from '../modules/digital-legacy/tokens.js';
import {
  legacyActivationEmailHtml,
  lifeCheckEmailHtml,
  reminderEmailHtml,
  sendEmail,
} from '../modules/digital-legacy/email.js';

export interface LegacyConfig {
  id: number;
  enabled: number;
  check_interval_days: number;
  reminder_1_days: number;
  reminder_2_days: number;
  activation_days: number;
  token_lifetime_hours: number;
  legacy_role: string;
  public_base_url: string | null;
  updated_at: string;
}

export interface LegacyContact {
  id: number;
  name: string;
  relationship: string;
  email: string;
  activation_priority: number;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface LegacyLifeState {
  id: number;
  last_confirmed_alive: string | null;
  last_check_email_sent_at: string | null;
  last_reminder_1_sent_at: string | null;
  last_reminder_2_sent_at: string | null;
  last_activation_sent_at: string | null;
  status: string;
  updated_at: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();
  return (to.getTime() - from) / (1000 * 60 * 60 * 24);
}

function getPublicBaseUrl(config: LegacyConfig): string {
  if (config.public_base_url?.trim()) return config.public_base_url.replace(/\/$/, '');
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const port = process.env.MY_LIFE_CLIENT_PORT ?? '3006';
  return `http://localhost:${port}`;
}

export function getConfig(): LegacyConfig {
  const db = getDb();
  return db.prepare('SELECT * FROM legacy_config WHERE id = 1').get() as LegacyConfig;
}

export function updateConfig(
  input: Partial<{
    enabled: boolean;
    check_interval_days: number;
    reminder_1_days: number;
    reminder_2_days: number;
    activation_days: number;
    token_lifetime_hours: number;
    legacy_role: string;
    public_base_url: string | null;
  }>,
  actor = 'admin',
): LegacyConfig {
  const current = getConfig();
  const db = getDb();

  db.prepare(
    `UPDATE legacy_config SET
      enabled = ?,
      check_interval_days = ?,
      reminder_1_days = ?,
      reminder_2_days = ?,
      activation_days = ?,
      token_lifetime_hours = ?,
      legacy_role = ?,
      public_base_url = ?,
      updated_at = datetime('now')
     WHERE id = 1`,
  ).run(
    input.enabled !== undefined ? (input.enabled ? 1 : 0) : current.enabled,
    input.check_interval_days ?? current.check_interval_days,
    input.reminder_1_days ?? current.reminder_1_days,
    input.reminder_2_days ?? current.reminder_2_days,
    input.activation_days ?? current.activation_days,
    input.token_lifetime_hours ?? current.token_lifetime_hours,
    input.legacy_role ?? current.legacy_role,
    input.public_base_url !== undefined ? input.public_base_url : current.public_base_url,
  );

  writeAudit({ action: 'config_updated', actor, detail: input });
  return getConfig();
}

export function getLifeState(): LegacyLifeState {
  const db = getDb();
  return db.prepare('SELECT * FROM legacy_life_state WHERE id = 1').get() as LegacyLifeState;
}

function setLifeState(patch: Partial<LegacyLifeState>): LegacyLifeState {
  const current = getLifeState();
  const db = getDb();
  db.prepare(
    `UPDATE legacy_life_state SET
      last_confirmed_alive = ?,
      last_check_email_sent_at = ?,
      last_reminder_1_sent_at = ?,
      last_reminder_2_sent_at = ?,
      last_activation_sent_at = ?,
      status = ?,
      updated_at = datetime('now')
     WHERE id = 1`,
  ).run(
    patch.last_confirmed_alive ?? current.last_confirmed_alive,
    patch.last_check_email_sent_at ?? current.last_check_email_sent_at,
    patch.last_reminder_1_sent_at ?? current.last_reminder_1_sent_at,
    patch.last_reminder_2_sent_at ?? current.last_reminder_2_sent_at,
    patch.last_activation_sent_at ?? current.last_activation_sent_at,
    patch.status ?? current.status,
  );
  return getLifeState();
}

export function listContacts(): LegacyContact[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT * FROM legacy_contacts
       ORDER BY activation_priority ASC, id ASC`,
    )
    .all() as LegacyContact[];
}

export function createContact(input: {
  name: string;
  relationship?: string;
  email: string;
  activation_priority?: number;
  enabled?: boolean;
}): LegacyContact {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO legacy_contacts (name, relationship, email, activation_priority, enabled)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      input.name.trim(),
      (input.relationship ?? '').trim(),
      input.email.trim().toLowerCase(),
      input.activation_priority ?? 1,
      input.enabled === false ? 0 : 1,
    );

  writeAudit({
    action: 'contact_created',
    actor: 'admin',
    contactId: Number(result.lastInsertRowid),
    detail: { email: input.email },
  });

  return db
    .prepare('SELECT * FROM legacy_contacts WHERE id = ?')
    .get(result.lastInsertRowid) as LegacyContact;
}

export function updateContact(
  id: number,
  input: Partial<{
    name: string;
    relationship: string;
    email: string;
    activation_priority: number;
    enabled: boolean;
  }>,
): LegacyContact | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM legacy_contacts WHERE id = ?').get(id) as
    | LegacyContact
    | undefined;
  if (!existing) return null;

  db.prepare(
    `UPDATE legacy_contacts SET
      name = ?,
      relationship = ?,
      email = ?,
      activation_priority = ?,
      enabled = ?,
      updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    input.name?.trim() ?? existing.name,
    input.relationship !== undefined ? input.relationship.trim() : existing.relationship,
    input.email?.trim().toLowerCase() ?? existing.email,
    input.activation_priority ?? existing.activation_priority,
    input.enabled !== undefined ? (input.enabled ? 1 : 0) : existing.enabled,
    id,
  );

  writeAudit({ action: 'contact_updated', actor: 'admin', contactId: id, detail: input });
  return db.prepare('SELECT * FROM legacy_contacts WHERE id = ?').get(id) as LegacyContact;
}

export function deleteContact(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM legacy_contacts WHERE id = ?').run(id);
  if (result.changes > 0) {
    writeAudit({ action: 'contact_deleted', actor: 'admin', contactId: id });
  }
  return result.changes > 0;
}

function ownerEmail(): string | null {
  const fromEnv = process.env.OWNER_EMAIL?.trim();
  if (fromEnv) return fromEnv;
  // Fall back to first settings display — owner must set OWNER_EMAIL for life checks
  return null;
}

async function createAndStoreToken(
  purpose: 'life_check' | 'legacy_activation',
  contactId: number | null,
  lifetimeHours: number,
): Promise<{ rawSigned: string; expiresAt: string }> {
  const db = getDb();
  const { raw, hash } = generateOneTimeToken();
  const expiresAt = new Date(Date.now() + lifetimeHours * 3600 * 1000).toISOString();

  db.prepare(
    `INSERT INTO legacy_tokens (purpose, token_hash, contact_id, expires_at)
     VALUES (?, ?, ?, ?)`,
  ).run(purpose, hash, contactId, expiresAt);

  const rawSigned = signUrlToken(raw, getTokenSigningSecret());
  return { rawSigned, expiresAt };
}

function lookupValidToken(
  signed: string,
  purpose: 'life_check' | 'legacy_activation',
): { id: number; contact_id: number | null; expires_at: string } | { error: string } {
  const raw = verifySignedUrlToken(signed, getTokenSigningSecret());
  if (!raw) {
    return { error: 'invalid_signature' };
  }

  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, contact_id, expires_at, used_at, revoked_at, purpose
       FROM legacy_tokens WHERE token_hash = ?`,
    )
    .get(hashToken(raw)) as
    | {
        id: number;
        contact_id: number | null;
        expires_at: string;
        used_at: string | null;
        revoked_at: string | null;
        purpose: string;
      }
    | undefined;

  if (!row || row.purpose !== purpose) return { error: 'not_found' };
  if (row.revoked_at) return { error: 'revoked' };
  if (row.used_at) return { error: 'already_used' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { error: 'expired' };

  return { id: row.id, contact_id: row.contact_id, expires_at: row.expires_at };
}

function markTokenUsed(id: number): void {
  getDb()
    .prepare(`UPDATE legacy_tokens SET used_at = datetime('now') WHERE id = ?`)
    .run(id);
}

/** Owner confirms alive from admin UI (no email token). */
export function confirmAliveManual(actor = 'admin', ip?: string | null): LegacyLifeState {
  getDb()
    .prepare(
      `UPDATE legacy_life_state SET
        last_reminder_1_sent_at = NULL,
        last_reminder_2_sent_at = NULL,
        last_activation_sent_at = NULL,
        status = 'active',
        last_confirmed_alive = ?,
        updated_at = datetime('now')
       WHERE id = 1`,
    )
    .run(nowIso());

  writeAudit({
    action: 'manual_confirm_alive',
    actor,
    ipAddress: ip,
  });
  return getLifeState();
}

/** Public: I'm Alive link from email. */
export function confirmAliveFromToken(
  signedToken: string,
  ip?: string | null,
): { ok: true } | { ok: false; error: string } {
  const result = lookupValidToken(signedToken, 'life_check');
  if ('error' in result) {
    writeAudit({
      action: result.error === 'expired' ? 'token_expired' : 'confirmation_failed',
      detail: { error: result.error },
      ipAddress: ip,
    });
    return { ok: false, error: result.error };
  }

  markTokenUsed(result.id);
  getDb()
    .prepare(
      `UPDATE legacy_life_state SET
        last_confirmed_alive = ?,
        status = 'active',
        last_reminder_1_sent_at = NULL,
        last_reminder_2_sent_at = NULL,
        last_activation_sent_at = NULL,
        updated_at = datetime('now')
       WHERE id = 1`,
    )
    .run(nowIso());

  writeAudit({
    action: 'confirmation_success',
    actor: 'owner',
    ipAddress: ip,
  });
  return { ok: true };
}

async function sendLifeCheckToOwner(): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  const email = ownerEmail();
  if (!email) {
    return { ok: false, error: 'OWNER_EMAIL not configured' };
  }

  const { rawSigned } = await createAndStoreToken(
    'life_check',
    null,
    config.token_lifetime_hours,
  );
  const confirmUrl = `${getPublicBaseUrl(config)}/legacy/confirm?token=${encodeURIComponent(rawSigned)}`;
  const content = lifeCheckEmailHtml(confirmUrl);
  const sent = await sendEmail({ to: email, ...content });

  if (sent.ok) {
    setLifeState({
      last_check_email_sent_at: nowIso(),
      status: 'awaiting_confirmation',
    });
    writeAudit({
      action: 'life_check_email_sent',
      detail: { to: email, provider: sent.provider },
    });
  }

  return sent.ok ? { ok: true } : { ok: false, error: sent.error };
}

async function sendReminder(which: 1 | 2): Promise<{ ok: boolean; error?: string }> {
  const config = getConfig();
  const email = ownerEmail();
  if (!email) return { ok: false, error: 'OWNER_EMAIL not configured' };

  const { rawSigned } = await createAndStoreToken(
    'life_check',
    null,
    config.token_lifetime_hours,
  );
  const confirmUrl = `${getPublicBaseUrl(config)}/legacy/confirm?token=${encodeURIComponent(rawSigned)}`;
  const content = reminderEmailHtml(which === 1 ? 'Month 1' : 'Month 2', confirmUrl);
  const sent = await sendEmail({ to: email, ...content });

  if (sent.ok) {
    if (which === 1) {
      setLifeState({ last_reminder_1_sent_at: nowIso(), status: 'reminder_1' });
      writeAudit({ action: 'reminder_1_email_sent', detail: { to: email } });
    } else {
      setLifeState({ last_reminder_2_sent_at: nowIso(), status: 'reminder_2' });
      writeAudit({ action: 'reminder_2_email_sent', detail: { to: email } });
    }
  }

  return sent.ok ? { ok: true } : { ok: false, error: sent.error };
}

async function triggerLegacyActivation(): Promise<{ ok: boolean; error?: string; sent: number }> {
  const config = getConfig();
  const contacts = listContacts()
    .filter((c) => c.enabled === 1)
    .sort((a, b) => a.activation_priority - b.activation_priority);

  if (contacts.length === 0) {
    writeAudit({
      action: 'legacy_activation_triggered',
      detail: { error: 'no_enabled_contacts' },
    });
    return { ok: false, error: 'No enabled legacy contacts', sent: 0 };
  }

  let sentCount = 0;
  for (const contact of contacts) {
    const { rawSigned } = await createAndStoreToken(
      'legacy_activation',
      contact.id,
      config.token_lifetime_hours,
    );
    const portalUrl = `${getPublicBaseUrl(config)}/legacy?token=${encodeURIComponent(rawSigned)}`;
    const content = legacyActivationEmailHtml(
      contact.name,
      portalUrl,
      config.token_lifetime_hours,
    );
    const sent = await sendEmail({ to: contact.email, ...content });
    if (sent.ok) {
      sentCount += 1;
      writeAudit({
        action: 'legacy_activation_email_sent',
        contactId: contact.id,
        detail: { to: contact.email, provider: sent.provider },
      });
    } else {
      writeAudit({
        action: 'legacy_activation_email_sent',
        contactId: contact.id,
        detail: { to: contact.email, error: sent.error },
      });
    }
  }

  setLifeState({
    last_activation_sent_at: nowIso(),
    status: 'activated',
  });
  writeAudit({
    action: 'legacy_activation_triggered',
    detail: { contacts: contacts.length, sent: sentCount },
  });

  return { ok: sentCount > 0, sent: sentCount };
}

/**
 * Evaluate inactivity schedule and send check / reminder / activation emails.
 * Safe to call repeatedly (idempotent per stage).
 */
export async function runLegacySchedulerTick(): Promise<{
  actions: string[];
  state: LegacyLifeState;
}> {
  const actions: string[] = [];
  const config = getConfig();

  writeAudit({ action: 'cron_run', detail: { enabled: !!config.enabled } });

  if (!config.enabled) {
    return { actions: ['disabled'], state: getLifeState() };
  }

  const state = getLifeState();
  if (state.status === 'claimed' || state.status === 'activated') {
    return { actions: ['already_activated_or_claimed'], state };
  }

  const lastAlive = state.last_confirmed_alive ?? state.updated_at;
  const inactiveDays = daysBetween(lastAlive);

  // Monthly life check email
  const lastCheck = state.last_check_email_sent_at;
  const needsCheck =
    !lastCheck || daysBetween(lastCheck) >= config.check_interval_days;

  if (needsCheck && inactiveDays < config.reminder_1_days) {
    const result = await sendLifeCheckToOwner();
    actions.push(result.ok ? 'life_check_sent' : `life_check_failed:${result.error}`);
    return { actions, state: getLifeState() };
  }

  // Month 1 reminder
  if (
    inactiveDays >= config.reminder_1_days &&
    inactiveDays < config.reminder_2_days &&
    !state.last_reminder_1_sent_at
  ) {
    const result = await sendReminder(1);
    actions.push(result.ok ? 'reminder_1_sent' : `reminder_1_failed:${result.error}`);
    return { actions, state: getLifeState() };
  }

  // Month 2 reminder
  if (
    inactiveDays >= config.reminder_2_days &&
    inactiveDays < config.activation_days &&
    !state.last_reminder_2_sent_at
  ) {
    const result = await sendReminder(2);
    actions.push(result.ok ? 'reminder_2_sent' : `reminder_2_failed:${result.error}`);
    return { actions, state: getLifeState() };
  }

  // Month 3 — legacy activation
  if (inactiveDays >= config.activation_days && !state.last_activation_sent_at) {
    const result = await triggerLegacyActivation();
    actions.push(
      result.ok
        ? `activation_sent:${result.sent}`
        : `activation_failed:${result.error}`,
    );
    return { actions, state: getLifeState() };
  }

  actions.push('noop');
  return { actions, state: getLifeState() };
}

export function verifyActivationToken(
  signedToken: string,
  ip?: string | null,
):
  | { ok: true; contact: LegacyContact; expires_at: string }
  | { ok: false; error: string } {
  const result = lookupValidToken(signedToken, 'legacy_activation');
  if ('error' in result) {
    writeAudit({
      action:
        result.error === 'expired'
          ? 'token_expired'
          : result.error === 'already_used'
            ? 'token_reuse_blocked'
            : 'confirmation_failed',
      detail: { error: result.error, purpose: 'legacy_activation' },
      ipAddress: ip,
    });
    return { ok: false, error: result.error };
  }

  if (!result.contact_id) {
    return { ok: false, error: 'no_contact' };
  }

  const contact = getDb()
    .prepare('SELECT * FROM legacy_contacts WHERE id = ?')
    .get(result.contact_id) as LegacyContact | undefined;

  if (!contact || !contact.enabled) {
    return { ok: false, error: 'contact_disabled' };
  }

  writeAudit({
    action: 'token_verified',
    contactId: contact.id,
    ipAddress: ip,
  });

  return { ok: true, contact, expires_at: result.expires_at };
}

export function claimLegacyAccess(
  signedToken: string,
  password: string,
  ip?: string | null,
): { ok: true; role: string; contact: LegacyContact } | { ok: false; error: string } {
  if (!password || password.length < 10) {
    writeAudit({ action: 'claim_failed', detail: { error: 'password_too_short' }, ipAddress: ip });
    return { ok: false, error: 'password_too_short' };
  }

  const tokenRow = lookupValidToken(signedToken, 'legacy_activation');
  if ('error' in tokenRow) {
    writeAudit({
      action:
        tokenRow.error === 'expired'
          ? 'token_expired'
          : tokenRow.error === 'already_used'
            ? 'token_reuse_blocked'
            : 'claim_failed',
      detail: { error: tokenRow.error },
      ipAddress: ip,
    });
    return { ok: false, error: tokenRow.error };
  }

  if (!tokenRow.contact_id) {
    return { ok: false, error: 'no_contact' };
  }

  const contact = getDb()
    .prepare('SELECT * FROM legacy_contacts WHERE id = ?')
    .get(tokenRow.contact_id) as LegacyContact | undefined;

  if (!contact || !contact.enabled) {
    writeAudit({ action: 'claim_failed', detail: { error: 'contact_disabled' }, ipAddress: ip });
    return { ok: false, error: 'contact_disabled' };
  }

  const config = getConfig();
  const { hash, salt } = hashPassword(password);
  const db = getDb();

  const existing = db
    .prepare('SELECT id FROM legacy_access WHERE contact_id = ?')
    .get(contact.id) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE legacy_access SET password_hash = ?, password_salt = ?, role = ?, claimed_at = datetime('now'), enabled = 1
       WHERE contact_id = ?`,
    ).run(hash, salt, config.legacy_role, contact.id);
  } else {
    db.prepare(
      `INSERT INTO legacy_access (contact_id, role, password_hash, password_salt, legacy_intro_completed)
       VALUES (?, ?, ?, ?, 0)`,
    ).run(contact.id, config.legacy_role, hash, salt);
  }

  markTokenUsed(tokenRow.id);
  setLifeState({ status: 'claimed' });

  writeAudit({
    action: 'claim_success',
    actor: 'legacy_contact',
    contactId: contact.id,
    ipAddress: ip,
    detail: { role: config.legacy_role },
  });

  return { ok: true, role: config.legacy_role, contact };
}

export function loginLegacy(
  email: string,
  password: string,
  ip?: string | null,
):
  | { ok: true; contact: LegacyContact; role: string; accessId: number }
  | { ok: false; error: string } {
  const db = getDb();
  const contact = db
    .prepare(
      `SELECT * FROM legacy_contacts WHERE lower(email) = lower(?) AND enabled = 1`,
    )
    .get(email.trim()) as LegacyContact | undefined;

  if (!contact) {
    writeAudit({ action: 'legacy_login_failed', detail: { error: 'unknown_email' }, ipAddress: ip });
    return { ok: false, error: 'invalid_credentials' };
  }

  const access = db
    .prepare(
      `SELECT * FROM legacy_access WHERE contact_id = ? AND enabled = 1`,
    )
    .get(contact.id) as
    | {
        id: number;
        role: string;
        password_hash: string;
        password_salt: string;
      }
    | undefined;

  if (!access || !verifyPassword(password, access.password_hash, access.password_salt)) {
    writeAudit({
      action: 'legacy_login_failed',
      contactId: contact.id,
      ipAddress: ip,
    });
    return { ok: false, error: 'invalid_credentials' };
  }

  db.prepare(
    `UPDATE legacy_access SET last_login_at = datetime('now') WHERE id = ?`,
  ).run(access.id);

  writeAudit({
    action: 'legacy_login_success',
    contactId: contact.id,
    ipAddress: ip,
  });

  return { ok: true, contact, role: access.role, accessId: access.id };
}

export function getDashboardStatus() {
  const config = getConfig();
  const state = getLifeState();
  const contacts = listContacts();
  const lastAlive = state.last_confirmed_alive;
  const inactiveDays = lastAlive ? daysBetween(lastAlive) : null;

  return {
    config,
    state,
    contacts,
    inactive_days: inactiveDays,
    owner_email_configured: !!ownerEmail(),
    next_stage:
      inactiveDays == null
        ? 'unknown'
        : inactiveDays >= config.activation_days
          ? 'activation'
          : inactiveDays >= config.reminder_2_days
            ? 'reminder_2'
            : inactiveDays >= config.reminder_1_days
              ? 'reminder_1'
              : 'life_check',
  };
}

/** Force send life check (admin test). */
export async function forceSendLifeCheck() {
  return sendLifeCheckToOwner();
}

/** Force trigger activation (admin test — still no passwords emailed). */
export async function forceTriggerActivation() {
  return triggerLegacyActivation();
}
