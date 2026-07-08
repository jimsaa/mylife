/** Maps canonical field keys to common label patterns (Swedish + English). */
export const KNOWN_SLEEP_FIELDS = new Set([
  'source',
  'date',
  'bedtime',
  'wake_time',
  'time_in_bed_minutes',
  'actual_sleep_minutes',
  'sleep_score',
  'overall_rating',
  'deep_sleep_minutes',
  'deep_sleep_rating',
  'rem_sleep_minutes',
  'rem_sleep_rating',
  'light_sleep_minutes',
  'awake_minutes',
  'sleep_efficiency_percent',
  'sleep_spo2_percent',
  'snoring_minutes',
  'snoring_detected',
  'sleep_avg_heart_rate',
  'sleep_min_heart_rate',
  'sleep_max_heart_rate',
]);

export const FIELD_ALIASES: Record<string, string[]> = {
  date: ['date', 'datum', 'sleep date', 'sömndatum'],
  bedtime: ['bedtime', 'läggtid', 'time to bed', 'gick och la mig'],
  wake_time: ['wake time', 'wake_time', 'uppvakning', 'woke up', 'vaknade'],
  time_in_bed_minutes: ['time in bed', 'tid i sängen', 'total sleep', 'total sömn', 'sovtid'],
  actual_sleep_minutes: ['actual sleep', 'verklig sovtid', 'real sleep'],
  sleep_score: ['sleep score', 'sömnpoäng', 'score'],
  overall_rating: ['overall', 'overall rating', 'betyg', 'rating', 'utmärkt', 'bra', 'ganska bra', 'dålig'],
  deep_sleep_minutes: ['deep sleep', 'djupsömn'],
  deep_sleep_rating: ['deep sleep rating', 'djupsömn betyg'],
  rem_sleep_minutes: ['rem sleep', 'rem-sömn', 'rem sömn'],
  rem_sleep_rating: ['rem rating', 'rem betyg'],
  light_sleep_minutes: ['light sleep', 'lätt sömn', 'lättsömn'],
  awake_minutes: ['awake', 'vaken', 'awake time'],
  sleep_efficiency_percent: ['sleep efficiency', 'sömn effektivitet', 'efficiency'],
  sleep_spo2_percent: ['spo2', 'blood oxygen', 'syre', 'blood oxygen during sleep'],
  snoring_minutes: ['snoring', 'snarkning', 'snore duration'],
  snoring_detected: ['snoring detected', 'snarkning upptäckt'],
  sleep_avg_heart_rate: ['average hr', 'avg hr', 'average heart rate', 'genomsnittlig puls', 'medelpuls'],
  sleep_min_heart_rate: ['min hr', 'lowest hr', 'lägsta puls', 'min heart rate'],
  sleep_max_heart_rate: ['max hr', 'highest hr', 'högsta puls', 'max heart rate'],
};

export function slugifyMetricName(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}
