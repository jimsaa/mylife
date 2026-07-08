-- Samsung Sleep Import V2
-- Version: 005

ALTER TABLE sleep_sessions ADD COLUMN awake_percent REAL;
ALTER TABLE sleep_sessions ADD COLUMN rem_percent REAL;
ALTER TABLE sleep_sessions ADD COLUMN light_percent REAL;
ALTER TABLE sleep_sessions ADD COLUMN deep_percent REAL;
ALTER TABLE sleep_sessions ADD COLUMN morning_readiness_score REAL;
ALTER TABLE sleep_sessions ADD COLUMN morning_readiness_label TEXT;

ALTER TABLE sleep_imports ADD COLUMN field_confidences_json TEXT;
ALTER TABLE sleep_imports ADD COLUMN extraction_flags_json TEXT;
ALTER TABLE sleep_imports ADD COLUMN pipeline_version TEXT DEFAULT 'v2';
