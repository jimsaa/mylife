-- TaxiLog V2: income split, bonus, savings ledger, monthly settlement lock.
-- Additive only. Historical GROSS_INCOME and salary totals stay unchanged.
-- Missing own_bookings/bonus remain NULL (unknown), not invented as zero.

ALTER TABLE taxi_log_settings ADD COLUMN private_net_target TEXT NOT NULL DEFAULT '13000';

ALTER TABLE taxi_work_days ADD COLUMN own_bookings TEXT;
ALTER TABLE taxi_work_days ADD COLUMN other_income TEXT;
ALTER TABLE taxi_work_days ADD COLUMN bonus TEXT;

ALTER TABLE taxi_monthly_payroll ADD COLUMN settlement_locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE taxi_monthly_payroll ADD COLUMN settlement_locked_at TEXT;

CREATE TABLE IF NOT EXISTS taxi_savings_ledger (
  id TEXT PRIMARY KEY,
  occurred_at TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  kind TEXT NOT NULL,
  amount TEXT NOT NULL,
  source_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
