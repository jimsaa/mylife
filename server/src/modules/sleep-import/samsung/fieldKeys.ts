export const SAMSUNG_MERGE_FIELDS = [
  'date',
  'bedtime',
  'wake_time',
  'time_in_bed_minutes',
  'actual_sleep_minutes',
  'sleep_score',
  'overall_rating',
  'actual_sleep_rating',
  'deep_sleep_rating',
  'rem_rating',
  'restfulness_rating',
  'sleep_latency_rating',
  'awake_minutes',
  'awake_percent',
  'rem_sleep_minutes',
  'rem_percent',
  'light_sleep_minutes',
  'light_percent',
  'deep_sleep_minutes',
  'deep_percent',
  'sleep_spo2_min',
  'sleep_spo2_avg',
  'sleep_spo2_max',
  'blood_oxygen_graph_detected',
] as const;

export type SamsungMergeField = (typeof SAMSUNG_MERGE_FIELDS)[number];

export type SamsungFieldConfidences = Partial<Record<SamsungMergeField, number>>;

export const EXPECTED_SCREEN_TYPES = ['overview', 'sleep_factors', 'sleep_stages'] as const;
