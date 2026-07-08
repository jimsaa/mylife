-- Samsung Health sleep import fields
-- Version: 004

ALTER TABLE sleep_sessions ADD COLUMN actual_sleep_rating TEXT;
ALTER TABLE sleep_sessions ADD COLUMN rem_rating TEXT;
ALTER TABLE sleep_sessions ADD COLUMN restfulness_rating TEXT;
ALTER TABLE sleep_sessions ADD COLUMN sleep_latency_rating TEXT;
ALTER TABLE sleep_sessions ADD COLUMN sleep_spo2_min REAL;
ALTER TABLE sleep_sessions ADD COLUMN sleep_spo2_avg REAL;
ALTER TABLE sleep_sessions ADD COLUMN sleep_spo2_max REAL;
ALTER TABLE sleep_sessions ADD COLUMN blood_oxygen_graph_detected INTEGER DEFAULT 0;

ALTER TABLE sleep_imports ADD COLUMN screenshot_type TEXT;
