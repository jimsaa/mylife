import type { SamsungSleepExtracted } from './types.js';

export function samsungToSessionInput(
  extracted: SamsungSleepExtracted
): import('./types.js').SamsungSleepSessionInput | null {
  if (!extracted.date) return null;
  return {
    source: 'Samsung Health Screenshot',
    screenshot_type: 'Sleep Details',
    date: extracted.date,
    bedtime: extracted.bedtime,
    wake_time: extracted.wake_time,
    time_in_bed_minutes: extracted.time_in_bed_minutes,
    actual_sleep_minutes: extracted.actual_sleep_minutes,
    sleep_score: extracted.sleep_score,
    overall_rating: extracted.overall_rating,
    actual_sleep_rating: extracted.actual_sleep_rating,
    deep_sleep_rating: extracted.deep_sleep_rating,
    rem_rating: extracted.rem_rating,
    rem_sleep_rating: extracted.rem_rating,
    restfulness_rating: extracted.restfulness_rating,
    sleep_latency_rating: extracted.sleep_latency_rating,
    awake_minutes: extracted.awake_minutes,
    awake_percent: extracted.awake_percent,
    rem_sleep_minutes: extracted.rem_sleep_minutes,
    rem_percent: extracted.rem_percent,
    light_sleep_minutes: extracted.light_sleep_minutes,
    light_percent: extracted.light_percent,
    deep_sleep_minutes: extracted.deep_sleep_minutes,
    deep_percent: extracted.deep_percent,
    sleep_spo2_min: extracted.sleep_spo2_min,
    sleep_spo2_avg: extracted.sleep_spo2_avg,
    sleep_spo2_max: extracted.sleep_spo2_max,
    blood_oxygen_graph_detected: extracted.blood_oxygen_graph_detected,
  };
}
