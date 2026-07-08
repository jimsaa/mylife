export interface SleepMetricInput {
  metric_name: string;
  metric_value: string;
  metric_unit: string | null;
  original_label: string;
}

export interface ExtractedSleepData {
  source: string | null;
  date: string | null;
  bedtime: string | null;
  wake_time: string | null;
  time_in_bed_minutes: number | null;
  actual_sleep_minutes: number | null;
  sleep_score: number | null;
  overall_rating: string | null;
  deep_sleep_minutes: number | null;
  deep_sleep_rating: string | null;
  rem_sleep_minutes: number | null;
  rem_sleep_rating: string | null;
  light_sleep_minutes: number | null;
  awake_minutes: number | null;
  sleep_efficiency_percent: number | null;
  sleep_spo2_percent: number | null;
  snoring_minutes: number | null;
  snoring_detected: boolean | null;
  sleep_avg_heart_rate: number | null;
  sleep_min_heart_rate: number | null;
  sleep_max_heart_rate: number | null;
  unknown_metrics: SleepMetricInput[];
  extraction_method: string;
  extraction_confidence: number;
  raw_text?: string | null;
}

export interface SleepSessionInput {
  source?: string | null;
  date: string;
  bedtime?: string | null;
  wake_time?: string | null;
  time_in_bed_minutes?: number | null;
  actual_sleep_minutes?: number | null;
  sleep_score?: number | null;
  overall_rating?: string | null;
  deep_sleep_minutes?: number | null;
  deep_sleep_rating?: string | null;
  rem_sleep_minutes?: number | null;
  rem_sleep_rating?: string | null;
  light_sleep_minutes?: number | null;
  awake_minutes?: number | null;
  awake_percent?: number | null;
  rem_percent?: number | null;
  light_percent?: number | null;
  deep_percent?: number | null;
  morning_readiness_score?: number | null;
  morning_readiness_label?: string | null;
  sleep_efficiency_percent?: number | null;
  sleep_spo2_percent?: number | null;
  snoring_minutes?: number | null;
  snoring_detected?: boolean | null;
  sleep_avg_heart_rate?: number | null;
  sleep_min_heart_rate?: number | null;
  sleep_max_heart_rate?: number | null;
  unknown_metrics?: SleepMetricInput[];
  actual_sleep_rating?: string | null;
  rem_rating?: string | null;
  restfulness_rating?: string | null;
  sleep_latency_rating?: string | null;
  sleep_spo2_min?: number | null;
  sleep_spo2_avg?: number | null;
  sleep_spo2_max?: number | null;
  blood_oxygen_graph_detected?: boolean | null;
  screenshot_type?: string | null;
}

export interface SleepSessionRecord extends SleepSessionInput {
  id: number;
  imported_at: string;
  created_at: string;
  updated_at: string;
  unknown_metrics?: SleepMetricInput[];
}

export interface SleepImportRecord {
  id: number;
  sleep_session_id: number | null;
  filename: string | null;
  source: string | null;
  imported_at: string;
  extraction_method: string | null;
  extraction_confidence: number | null;
  screenshot_path: string | null;
  screenshot_type: string | null;
  field_confidences_json?: string | null;
  extraction_flags_json?: string | null;
  pipeline_version?: string | null;
}

export interface DuplicateMatch {
  session: SleepSessionRecord;
  match_reason: string;
}

export type DuplicateAction = 'update' | 'keep_both' | 'cancel';

export interface ScreenshotInput {
  image_base64: string;
  filename?: string | null;
}

export interface SaveSleepImportPayload {
  session: SleepSessionInput;
  filename?: string | null;
  extraction_method?: string | null;
  extraction_confidence?: number | null;
  screenshot_base64?: string | null;
  screenshots?: ScreenshotInput[] | null;
  duplicate_action?: DuplicateAction;
  existing_session_id?: number | null;
  screenshot_type?: string | null;
  field_confidences_json?: string | null;
  extraction_flags_json?: string | null;
  pipeline_version?: string | null;
}
