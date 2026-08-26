-- Digital Legacy V1.1 — Estate Planning foundation
-- Welcome intro flag, editable welcome message, Legacy Instructions handbook

ALTER TABLE legacy_access ADD COLUMN legacy_intro_completed INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS legacy_welcome_message (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO legacy_welcome_message (id, title, body) VALUES (
  1,
  'If You''re Reading This...',
  'If you''re reading this, My Life has determined that I am no longer able to manage this system myself.

Over many years I have built this system as the central hub for my projects, businesses, documents, knowledge and ideas.

Please take your time.

Everything has been organized to make it as easy as possible to understand what exists and what should happen next.

This system is intended to help you.

Start by reading the Legacy Instructions before exploring the rest of My Life.'
);

CREATE TABLE IF NOT EXISTS legacy_instruction_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_legacy_instruction_sort
  ON legacy_instruction_sections (sort_order ASC, id ASC);
