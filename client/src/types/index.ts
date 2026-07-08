export interface Project {
  id: number;
  name: string;
  status: 'active' | 'archived' | 'paused';
  priority: number;
  goal: string | null;
  description: string | null;
  notes: string | null;
  roi_rating: number | null;
  color: string;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
  total_hours?: number;
  hours_last_7_days?: number;
  hours_last_30_days?: number;
}

export interface TimeEntry {
  id: number;
  project_id: number | null;
  calendar_event_id: number | null;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  notes: string | null;
  is_manual: number;
  created_at: string;
  project_name?: string | null;
  project_color?: string | null;
}

export interface CalendarEvent {
  id: number;
  title: string;
  project_id: number | null;
  start_time: string;
  end_time: string;
  all_day: number;
  color: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  project_name?: string | null;
}

export interface DailyFocus {
  id: number;
  date: string;
  focus_text: string;
  created_at: string;
  updated_at: string;
}

export interface DailyNote {
  id: number;
  date: string;
  journal_text: string | null;
  reflection_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyWellbeing {
  id: number;
  date: string;
  energy_level: number | null;
  mood_level: number | null;
  stress_level: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: number;
  sleep_date: string;
  hours_slept: number;
  quality: number | null;
  notes: string | null;
  created_at: string;
}

export interface DailySleepCheckin {
  id: number;
  date: string;
  sleep_score: number;
  actual_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  morning_energy: number;
  morning_readiness_score: number | null;
  morning_readiness_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveDailySleepCheckinPayload {
  date?: string;
  sleep_score: number;
  actual_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  morning_energy: number;
}

export interface SaveDailySleepCheckinResponse {
  checkin: DailySleepCheckin;
  readiness: MorningReadiness;
}

export interface DashboardMorningSleep {
  sleep_score: number;
  actual_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  morning_energy: number;
  morning_readiness_score: number | null;
  morning_readiness_label: string | null;
  morning_readiness_emoji: string | null;
}

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
  awake_percent?: number | null;
  rem_sleep_minutes: number | null;
  rem_percent?: number | null;
  light_sleep_minutes: number | null;
  light_percent?: number | null;
  deep_sleep_minutes: number | null;
  deep_percent?: number | null;
  sleep_spo2_min: number | null;
  sleep_spo2_avg: number | null;
  sleep_spo2_max: number | null;
  blood_oxygen_graph_detected: boolean;
  extraction_method: 'samsung_ocr';
  extraction_confidence: number;
}

export type SamsungFieldConfidences = Partial<Record<string, number>>;

export type SamsungFieldFlag = 'ok' | 'low_confidence' | 'requires_confirmation' | 'suspicious';

export interface MorningReadiness {
  score: number;
  label: string;
  emoji: string;
  factors: string[];
}

export interface SamsungImageExtraction {
  image_index: number;
  filename: string | null;
  image_type: string;
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

export interface SamsungSleepSessionInput extends SleepSessionInput {
  source: 'Samsung Health Screenshot';
  screenshot_type: 'Sleep Details';
}

export interface SamsungScreenshotInput {
  image_base64: string;
  filename?: string | null;
}

export interface SamsungSleepExtractResponse {
  extracted: SamsungSleepExtracted;
  field_confidences: SamsungFieldConfidences;
  field_flags: Partial<Record<string, SamsungFieldFlag>>;
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
  duplicates: DuplicateMatch[];
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
  field_confidences_json?: string | null;
  extraction_flags_json?: string | null;
}

export interface SaveSamsungSleepResponse {
  session: SleepSessionRecord;
  morning_readiness: MorningReadiness;
}

export interface SleepSessionRecord extends SleepSessionInput {
  id: number;
  imported_at: string;
  created_at: string;
  updated_at: string;
}

export interface DuplicateMatch {
  session: SleepSessionRecord;
  match_reason: string;
}

export type DuplicateAction = 'update' | 'keep_both' | 'cancel';

export interface SleepImportExtractResponse {
  extracted: ExtractedSleepData;
  filename: string | null;
  duplicates: DuplicateMatch[];
}

export interface SaveSleepImportPayload {
  session: SleepSessionInput;
  filename?: string | null;
  extraction_method?: string | null;
  extraction_confidence?: number | null;
  screenshot_base64?: string | null;
  duplicate_action?: DuplicateAction;
  existing_session_id?: number | null;
}

export interface FoodEntry {
  id: number;
  date: string;
  meal_category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  description: string;
  calories: number;
  created_at: string;
}

export interface TaxiShift {
  id: number;
  shift_date: string;
  shift_start: string | null;
  shift_end: string | null;
  hours_worked: number;
  shift_type: string | null;
  income: number | null;
  notes: string | null;
  created_at: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  start_date: string | null;
  target_date: string | null;
  progress_percent: number;
  status: 'active' | 'completed' | 'paused' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface DashboardHero {
  display_name: string;
  greeting: string;
  insight: string;
  today_summary: {
    logged_hours: number;
    taxi_hours: number;
    energy: number | null;
    calories: number;
  };
  week_summary: {
    worked_hours: number;
    focus_project_name: string | null;
    avg_sleep: number | null;
    avg_energy: number | null;
  };
}

export interface ProfileSettings {
  display_name: string;
  avatar_path: string | null;
  avatar_url: string | null;
}

export interface DashboardData {
  today: string;
  week_number: number;
  planned_hours_today: number;
  actual_hours_today: number;
  weekly_total_hours: number;
  weekly_focus_project: Project | null;
  latest_activities: TimeEntry[];
  daily_energy: number | null;
  daily_calories: number;
  calorie_target: number;
  workload_indicator: 'green' | 'yellow' | 'red';
  daily_focus: DailyFocus | null;
  morning_sleep: DashboardMorningSleep | null;
  hero: DashboardHero;
}

export interface StatsSummary {
  period_days: number;
  time_by_project: { project_id: number; project_name: string; color: string; hours: number }[];
  taxi_hours: number;
  focused_work_hours: number;
  avg_energy: number | null;
  avg_calories: number | null;
  avg_sleep: number | null;
  avg_mood: number | null;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface StatsTrends {
  period_days: number;
  time_allocation: { project_id: number; project_name: string; color: string; hours: number }[];
  most_active_projects: { project_id: number; project_name: string; color: string; hours: number }[];
  taxi_trend: TrendPoint[];
  focused_work_trend: TrendPoint[];
  energy_trend: TrendPoint[];
  mood_trend: TrendPoint[];
  sleep_trend: TrendPoint[];
  calorie_trend: TrendPoint[];
}

export interface TimerStatus {
  active: boolean;
  paused: boolean;
  entry: TimeEntry | null;
  timer: {
    project_id: number | null;
    start_time: string;
    paused_at: string | null;
    accumulated_pause_ms: number;
    notes: string | null;
  } | null;
}

export interface FoodDayData {
  entries: FoodEntry[];
  total_calories: number;
  target: number;
  remaining: number;
}

export interface TaxiData {
  shifts: TaxiShift[];
  weekly_hours: number;
  monthly_hours: number;
}

export interface TeslaViewEvent {
  id: number;
  title: string;
  time: string;
  start_time: string;
  end_time: string;
  project_name: string | null;
  notes: string | null;
  color: string | null;
}

export interface TeslaTimerStatus {
  active: boolean;
  paused: boolean;
  timer: {
    start_time: string;
    shift_date: string;
    paused_at: string | null;
    accumulated_pause_ms: number;
  } | null;
  elapsed_seconds: number;
}

export interface TeslaViewData {
  today: string;
  sleep: {
    sleep_score: number;
    morning_energy: number;
    morning_energy_emoji: string | null;
    checkin: DailySleepCheckin;
  } | null;
  taxi_hours_today: number;
  taxi_hours_today_display: string;
  logged_hours_today: number;
  tonight_focus: string[];
  tonight_events: TeslaViewEvent[];
  remaining_schedule: TeslaViewEvent[];
  taxi_timer: TeslaTimerStatus;
  life_snapshot: {
    week: {
      taxi_hours: number;
      project_hours: number;
      avg_sleep_score: number | null;
      avg_energy: number | null;
    };
    month: {
      taxi_hours: number;
      avg_sleep_score: number | null;
    };
  };
}
