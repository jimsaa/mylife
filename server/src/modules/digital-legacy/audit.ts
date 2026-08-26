import { getDb } from '../../db/connection.js';

export type LegacyAuditAction =
  | 'config_updated'
  | 'contact_created'
  | 'contact_updated'
  | 'contact_deleted'
  | 'life_check_email_sent'
  | 'reminder_1_email_sent'
  | 'reminder_2_email_sent'
  | 'confirmation_success'
  | 'confirmation_failed'
  | 'legacy_activation_email_sent'
  | 'legacy_activation_triggered'
  | 'token_verified'
  | 'token_expired'
  | 'token_reuse_blocked'
  | 'claim_success'
  | 'claim_failed'
  | 'legacy_login_success'
  | 'legacy_login_failed'
  | 'manual_confirm_alive'
  | 'cron_run';

export function writeAudit(params: {
  action: LegacyAuditAction | string;
  actor?: string;
  contactId?: number | null;
  detail?: string | Record<string, unknown> | null;
  ipAddress?: string | null;
}): void {
  const db = getDb();
  const detail =
    params.detail == null
      ? null
      : typeof params.detail === 'string'
        ? params.detail
        : JSON.stringify(params.detail);

  db.prepare(
    `INSERT INTO legacy_audit_log (action, actor, contact_id, detail, ip_address)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    params.action,
    params.actor ?? 'system',
    params.contactId ?? null,
    detail,
    params.ipAddress ?? null,
  );
}

export function listAudit(limit = 100): Array<{
  id: number;
  action: string;
  actor: string;
  contact_id: number | null;
  detail: string | null;
  ip_address: string | null;
  created_at: string;
}> {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, action, actor, contact_id, detail, ip_address, created_at
       FROM legacy_audit_log
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(Math.min(Math.max(limit, 1), 500)) as Array<{
    id: number;
    action: string;
    actor: string;
    contact_id: number | null;
    detail: string | null;
    ip_address: string | null;
    created_at: string;
  }>;
}
