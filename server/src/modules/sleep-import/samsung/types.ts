import type { SamsungFieldConfidences } from './fieldKeys.js';
import type { SamsungImageType } from './classifyImage.js';
import type { FieldFlag } from './validate.js';
import type { MorningReadiness } from './morningReadiness.js';

export interface SamsungSleepExtracted {
  source: 'Samsung Health Screenshot';
  screenshot_type: 'Sleep Details';
  date: string | null;
  time_in_bed_minutes: number | null;
  actual_sleep_minutes: number | null;
  bedtime: string | null;
  wake_time: string | null;
  sleep_score: number | null;
  overall_rating: string | null;
  actual_sleep_rating: string | null;
  deep_sleep_rating: string | null;
  rem_rating: string | null;
  restfulness_rating: string | null;
  sleep_latency_rating: string | null;
  awake_minutes: number | null;
  awake_percent: number | null;
  rem_sleep_minutes: number | null;
  rem_percent: number | null;
  light_sleep_minutes: number | null;
  light_percent: number | null;
  deep_sleep_minutes: number | null;
  deep_percent: number | null;
  sleep_spo2_min: number | null;
  sleep_spo2_avg: number | null;
  sleep_spo2_max: number | null;
  blood_oxygen_graph_detected: boolean;
  extraction_method: 'samsung_ocr';
  extraction_confidence: number;
  raw_text?: string | null;
}

export interface SamsungImageExtraction {
  image_index: number;
  filename: string | null;
  image_type: SamsungImageType;
  classification_confidence: number;
  extracted: SamsungSleepExtracted;
  field_confidences: SamsungFieldConfidences;
}

export interface SamsungSessionConflict {
  image_index: number;
  filename: string | null;
  date: string | null;
  bedtime: string | null;
  wake_time: string | null;
}

export interface SamsungSleepMultiExtractResult {
  extracted: SamsungSleepExtracted;
  field_confidences: SamsungFieldConfidences;
  field_flags: Partial<Record<string, FieldFlag>>;
  requires_user_confirmation: boolean;
  suspicious_fields: string[];
  low_confidence_fields: string[];
  per_image: SamsungImageExtraction[];
  image_count: number;
  has_session_conflict: boolean;
  session_conflicts: SamsungSessionConflict[];
  filenames: string[];
  morning_readiness_preview: MorningReadiness | null;
  pipeline_version: 'v2';
}

export interface SamsungSleepExtractResponse extends SamsungSleepMultiExtractResult {
  duplicates: DuplicateMatch[];
}

export interface DuplicateMatch {
  session: SleepSessionRecord;
  match_reason: string;
}

export interface SleepSessionRecord {
  id: number;
  date: string;
  bedtime?: string | null;
  wake_time?: string | null;
  morning_readiness_score?: number | null;
  morning_readiness_label?: string | null;
  [key: string]: unknown;
}

export type DuplicateAction = 'update' | 'keep_both' | 'cancel';

export interface SamsungScreenshotInput {
  image_base64: string;
  filename?: string | null;
}

export interface SaveSamsungSleepPayload {
  session: SamsungSleepSessionInput;
  filename?: string | null;
  filenames?: string[] | null;
  extraction_confidence?: number | null;
  screenshot_base64?: string | null;
  screenshots?: SamsungScreenshotInput[] | null;
  duplicate_action?: DuplicateAction;
  existing_session_id?: number | null;
  user_confirmed?: boolean;
}

export interface SamsungSleepSessionInput {
  source: 'Samsung Health Screenshot';
  screenshot_type: 'Sleep Details';
  date: string;
  bedtime?: string | null;
  wake_time?: string | null;
  time_in_bed_minutes?: number | null;
  actual_sleep_minutes?: number | null;
  sleep_score?: number | null;
  overall_rating?: string | null;
  actual_sleep_rating?: string | null;
  deep_sleep_rating?: string | null;
  rem_rating?: string | null;
  rem_sleep_rating?: string | null;
  restfulness_rating?: string | null;
  sleep_latency_rating?: string | null;
  awake_minutes?: number | null;
  awake_percent?: number | null;
  rem_sleep_minutes?: number | null;
  rem_percent?: number | null;
  light_sleep_minutes?: number | null;
  light_percent?: number | null;
  deep_sleep_minutes?: number | null;
  deep_percent?: number | null;
  sleep_spo2_min?: number | null;
  sleep_spo2_avg?: number | null;
  sleep_spo2_max?: number | null;
  blood_oxygen_graph_detected?: boolean | null;
}

export interface SaveSamsungSleepResult {
  session: SleepSessionRecord;
  morning_readiness: MorningReadiness;
}
