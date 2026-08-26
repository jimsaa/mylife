-- Digital Legacy Module V1
-- Dead man's switch: monthly life checks, reminders, secure one-time legacy activation

CREATE TABLE IF NOT EXISTS legacy_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled INTEGER NOT NULL DEFAULT 0,
  check_interval_days INTEGER NOT NULL DEFAULT 30,
  reminder_1_days INTEGER NOT NULL DEFAULT 30,
  reminder_2_days INTEGER NOT NULL DEFAULT 60,
  activation_days INTEGER NOT NULL DEFAULT 90,
  token_lifetime_hours INTEGER NOT NULL DEFAULT 72,
  legacy_role TEXT NOT NULL DEFAULT 'legacy_viewer',
  public_base_url TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO legacy_config (id) VALUES (1);

CREATE TABLE IF NOT EXISTS legacy_life_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_confirmed_alive TEXT,
  last_check_email_sent_at TEXT,
  last_reminder_1_sent_at TEXT,
  last_reminder_2_sent_at TEXT,
  last_activation_sent_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'awaiting_confirmation', 'reminder_1', 'reminder_2', 'activated', 'claimed')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO legacy_life_state (id, last_confirmed_alive, status)
VALUES (1, datetime('now'), 'active');

CREATE TABLE IF NOT EXISTS legacy_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  activation_priority INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_legacy_contacts_priority
  ON legacy_contacts (enabled, activation_priority, id);

CREATE TABLE IF NOT EXISTS legacy_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purpose TEXT NOT NULL CHECK (purpose IN ('life_check', 'legacy_activation')),
  token_hash TEXT NOT NULL UNIQUE,
  contact_id INTEGER REFERENCES legacy_contacts(id) ON DELETE SET NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_legacy_tokens_hash ON legacy_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_legacy_tokens_purpose ON legacy_tokens (purpose, used_at, expires_at);

CREATE TABLE IF NOT EXISTS legacy_access (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contact_id INTEGER NOT NULL REFERENCES legacy_contacts(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'legacy_viewer',
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_legacy_access_contact ON legacy_access (contact_id);

CREATE TABLE IF NOT EXISTS legacy_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  contact_id INTEGER,
  detail TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_legacy_audit_created ON legacy_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_legacy_audit_action ON legacy_audit_log (action);
