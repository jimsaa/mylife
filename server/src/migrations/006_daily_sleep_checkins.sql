-- Morning Sleep Check-In
-- Version: 006

CREATE TABLE IF NOT EXISTS daily_sleep_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  sleep_score INTEGER NOT NULL CHECK (sleep_score BETWEEN 0 AND 100),
  actual_sleep_minutes INTEGER NOT NULL CHECK (actual_sleep_minutes >= 0),
  deep_sleep_minutes INTEGER NOT NULL CHECK (deep_sleep_minutes >= 0),
  rem_sleep_minutes INTEGER NOT NULL CHECK (rem_sleep_minutes >= 0),
  morning_energy INTEGER NOT NULL CHECK (morning_energy BETWEEN 1 AND 5),
  morning_readiness_score REAL,
  morning_readiness_label TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_sleep_checkins_date ON daily_sleep_checkins(date DESC);
