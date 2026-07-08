import type { SleepSessionInput } from '../modules/sleep-import/types.js';

export function buildSessionDbParams(session: SleepSessionInput, id?: number) {
  return {
    ...(id !== undefined ? { id } : {}),
    source: session.source ?? null,
    date: session.date,
    bedtime: session.bedtime ?? null,
    wake_time: session.wake_time ?? null,
    time_in_bed_minutes: session.time_in_bed_minutes ?? null,
    actual_sleep_minutes: session.actual_sleep_minutes ?? null,
    sleep_score: session.sleep_score ?? null,
    overall_rating: session.overall_rating ?? null,
    deep_sleep_minutes: session.deep_sleep_minutes ?? null,
    deep_sleep_rating: session.deep_sleep_rating ?? null,
    rem_sleep_minutes: session.rem_sleep_minutes ?? null,
    rem_sleep_rating: session.rem_sleep_rating ?? session.rem_rating ?? null,
    light_sleep_minutes: session.light_sleep_minutes ?? null,
    awake_minutes: session.awake_minutes ?? null,
    awake_percent: session.awake_percent ?? null,
    rem_sleep_minutes: session.rem_sleep_minutes ?? null,
    rem_percent: session.rem_percent ?? null,
    light_sleep_minutes: session.light_sleep_minutes ?? null,
    light_percent: session.light_percent ?? null,
    deep_sleep_minutes: session.deep_sleep_minutes ?? null,
    deep_percent: session.deep_percent ?? null,
    sleep_efficiency_percent: session.sleep_efficiency_percent ?? null,
    sleep_spo2_percent: session.sleep_spo2_percent ?? null,
    snoring_minutes: session.snoring_minutes ?? null,
    snoring_detected: session.snoring_detected ? 1 : session.snoring_detected === false ? 0 : null,
    sleep_avg_heart_rate: session.sleep_avg_heart_rate ?? null,
    sleep_min_heart_rate: session.sleep_min_heart_rate ?? null,
    sleep_max_heart_rate: session.sleep_max_heart_rate ?? null,
    actual_sleep_rating: session.actual_sleep_rating ?? null,
    rem_rating: session.rem_rating ?? session.rem_sleep_rating ?? null,
    restfulness_rating: session.restfulness_rating ?? null,
    sleep_latency_rating: session.sleep_latency_rating ?? null,
    sleep_spo2_min: session.sleep_spo2_min ?? null,
    sleep_spo2_avg: session.sleep_spo2_avg ?? null,
    sleep_spo2_max: session.sleep_spo2_max ?? null,
    blood_oxygen_graph_detected: session.blood_oxygen_graph_detected ? 1 : 0,
    morning_readiness_score: session.morning_readiness_score ?? null,
    morning_readiness_label: session.morning_readiness_label ?? null,
  };
}

export const SESSION_COLUMNS = `
  source, date, bedtime, wake_time, time_in_bed_minutes, actual_sleep_minutes,
  sleep_score, overall_rating, deep_sleep_minutes, deep_sleep_rating,
  rem_sleep_minutes, rem_sleep_rating, light_sleep_minutes, awake_minutes,
  awake_percent, rem_percent, light_percent, deep_percent,
  sleep_efficiency_percent, sleep_spo2_percent, snoring_minutes, snoring_detected,
  sleep_avg_heart_rate, sleep_min_heart_rate, sleep_max_heart_rate,
  actual_sleep_rating, rem_rating, restfulness_rating, sleep_latency_rating,
  sleep_spo2_min, sleep_spo2_avg, sleep_spo2_max, blood_oxygen_graph_detected,
  morning_readiness_score, morning_readiness_label
`;

export const SESSION_PLACEHOLDERS = `
  @source, @date, @bedtime, @wake_time, @time_in_bed_minutes, @actual_sleep_minutes,
  @sleep_score, @overall_rating, @deep_sleep_minutes, @deep_sleep_rating,
  @rem_sleep_minutes, @rem_sleep_rating, @light_sleep_minutes, @awake_minutes,
  @awake_percent, @rem_percent, @light_percent, @deep_percent,
  @sleep_efficiency_percent, @sleep_spo2_percent, @snoring_minutes, @snoring_detected,
  @sleep_avg_heart_rate, @sleep_min_heart_rate, @sleep_max_heart_rate,
  @actual_sleep_rating, @rem_rating, @restfulness_rating, @sleep_latency_rating,
  @sleep_spo2_min, @sleep_spo2_avg, @sleep_spo2_max, @blood_oxygen_graph_detected,
  @morning_readiness_score, @morning_readiness_label
`;

export const SESSION_UPDATE_SET = `
  source = @source, date = @date, bedtime = @bedtime, wake_time = @wake_time,
  time_in_bed_minutes = @time_in_bed_minutes, actual_sleep_minutes = @actual_sleep_minutes,
  sleep_score = @sleep_score, overall_rating = @overall_rating,
  deep_sleep_minutes = @deep_sleep_minutes, deep_sleep_rating = @deep_sleep_rating,
  rem_sleep_minutes = @rem_sleep_minutes, rem_sleep_rating = @rem_sleep_rating,
  light_sleep_minutes = @light_sleep_minutes, awake_minutes = @awake_minutes,
  awake_percent = @awake_percent, rem_percent = @rem_percent,
  light_percent = @light_percent, deep_percent = @deep_percent,
  sleep_efficiency_percent = @sleep_efficiency_percent, sleep_spo2_percent = @sleep_spo2_percent,
  snoring_minutes = @snoring_minutes, snoring_detected = @snoring_detected,
  sleep_avg_heart_rate = @sleep_avg_heart_rate, sleep_min_heart_rate = @sleep_min_heart_rate,
  sleep_max_heart_rate = @sleep_max_heart_rate,
  actual_sleep_rating = @actual_sleep_rating, rem_rating = @rem_rating,
  restfulness_rating = @restfulness_rating, sleep_latency_rating = @sleep_latency_rating,
  sleep_spo2_min = @sleep_spo2_min, sleep_spo2_avg = @sleep_spo2_avg, sleep_spo2_max = @sleep_spo2_max,
  blood_oxygen_graph_detected = @blood_oxygen_graph_detected,
  morning_readiness_score = @morning_readiness_score,
  morning_readiness_label = @morning_readiness_label,
  updated_at = datetime('now')
`;
