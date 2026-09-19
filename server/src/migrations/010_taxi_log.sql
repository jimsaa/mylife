-- TaxiLog daily reporting, charging, and monthly salary.
-- Additive only: does not alter taxi_shifts or other My Life tables.

CREATE TABLE IF NOT EXISTS taxi_log_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  vat_rate TEXT NOT NULL DEFAULT '6',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO taxi_log_settings (id, vat_rate) VALUES ('default', '6');

CREATE TABLE IF NOT EXISTS taxi_work_days (
  date TEXT PRIMARY KEY,
  work_hours TEXT NOT NULL DEFAULT '0',
  total_income TEXT NOT NULL DEFAULT '0',
  tips TEXT NOT NULL DEFAULT '0',
  vat_rate TEXT NOT NULL DEFAULT '6',
  vat_amount TEXT NOT NULL DEFAULT '0',
  income_ex_vat TEXT NOT NULL DEFAULT '0',
  total_costs TEXT NOT NULL DEFAULT '0',
  total_km TEXT NOT NULL DEFAULT '0',
  number_of_trips INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS taxi_charging_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  kwh TEXT NOT NULL DEFAULT '0',
  location TEXT NOT NULL DEFAULT 'Hemma',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_taxi_charging_date_location
  ON taxi_charging_sessions (date, location);

CREATE TABLE IF NOT EXISTS taxi_monthly_payroll (
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_work_days INTEGER NOT NULL DEFAULT 0,
  total_work_hours TEXT NOT NULL DEFAULT '0',
  total_income TEXT NOT NULL DEFAULT '0',
  total_tips TEXT NOT NULL DEFAULT '0',
  vat_rate TEXT,
  total_vat TEXT NOT NULL DEFAULT '0',
  total_income_ex_vat TEXT NOT NULL DEFAULT '0',
  total_costs TEXT NOT NULL DEFAULT '0',
  accrued_salary TEXT NOT NULL DEFAULT '0',
  salary_status TEXT NOT NULL DEFAULT 'ACCRUING',
  payment_date TEXT,
  paid_amount TEXT NOT NULL DEFAULT '0',
  remaining_amount TEXT NOT NULL DEFAULT '0',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (year, month)
);

CREATE TABLE IF NOT EXISTS taxi_salary_payments (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  payment_date TEXT NOT NULL,
  amount TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (year, month) REFERENCES taxi_monthly_payroll (year, month) ON DELETE CASCADE
);
