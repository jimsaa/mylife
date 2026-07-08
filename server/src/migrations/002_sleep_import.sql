-- Sleep screenshot import schema
-- Version: 002

CREATE TABLE IF NOT EXISTS sleep_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  date TEXT NOT NULL,
  bedtime TEXT,
  wake_time TEXT,
  time_in_bed_minutes INTEGER,
  actual_sleep_minutes INTEGER,
  sleep_score INTEGER,
  overall_rating TEXT,
  deep_sleep_minutes INTEGER,
  deep_sleep_rating TEXT,
  rem_sleep_minutes INTEGER,
  rem_sleep_rating TEXT,
  light_sleep_minutes INTEGER,
  awake_minutes INTEGER,
  sleep_efficiency_percent REAL,
  sleep_spo2_percent REAL,
  snoring_minutes INTEGER,
  snoring_detected INTEGER,
  sleep_avg_heart_rate INTEGER,
  sleep_min_heart_rate INTEGER,
  sleep_max_heart_rate INTEGER,
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sleep_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sleep_session_id INTEGER NOT NULL REFERENCES sleep_sessions(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value TEXT NOT NULL,
  metric_unit TEXT,
  original_label TEXT
);

CREATE TABLE IF NOT EXISTS sleep_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sleep_session_id INTEGER REFERENCES sleep_sessions(id) ON DELETE SET NULL,
  filename TEXT,
  source TEXT,
  imported_at TEXT NOT NULL DEFAULT (datetime('now')),
  extraction_method TEXT,
  extraction_confidence REAL,
  screenshot_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_sleep_sessions_date ON sleep_sessions(date);
CREATE INDEX IF NOT EXISTS idx_sleep_sessions_bedtime_wake ON sleep_sessions(date, bedtime, wake_time);
CREATE INDEX IF NOT EXISTS idx_sleep_metrics_session ON sleep_metrics(sleep_session_id);
CREATE INDEX IF NOT EXISTS idx_sleep_imports_session ON sleep_imports(sleep_session_id);
