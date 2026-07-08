export const APP_NAME = 'My Life';

/** Base path for the private My Life dashboard (not linked from the public site). */
export const ADMIN_BASE = '/admin';
export const ADMIN_LOGIN = `${ADMIN_BASE}/login`;

export const NAV_ITEMS = [
  { path: ADMIN_BASE, label: 'Översikt' },
  { path: `${ADMIN_BASE}/kalender`, label: 'Kalender' },
  { path: `${ADMIN_BASE}/tid`, label: 'Tid' },
  { path: `${ADMIN_BASE}/projekt`, label: 'Projekt' },
  { path: `${ADMIN_BASE}/statistik`, label: 'Statistik' },
  { path: `${ADMIN_BASE}/journal`, label: 'Journal' },
  { path: `${ADMIN_BASE}/valbefinnande`, label: 'Välbefinnande' },
  { path: `${ADMIN_BASE}/somn`, label: 'Sömn' },
  { path: `${ADMIN_BASE}/mat`, label: 'Mat' },
  { path: `${ADMIN_BASE}/taxi`, label: 'Taxi' },
  { path: `${ADMIN_BASE}/mal`, label: 'Mål' },
  { path: `${ADMIN_BASE}/installningar`, label: 'Inställningar' },
] as const;

export const MEAL_CATEGORIES = {
  breakfast: 'Frukost',
  lunch: 'Lunch',
  dinner: 'Middag',
  snack: 'Mellanmål',
} as const;

export const MORNING_ENERGY_LABELS: Record<number, string> = {
  1: '😴 Helt slut',
  2: '😕 Trött',
  3: '🙂 Okej',
  4: '😊 Bra energi',
  5: '🚀 Grym energi',
};

export const MORNING_ENERGY_EMOJI: Record<number, string> = {
  1: '😴',
  2: '😕',
  3: '🙂',
  4: '😊',
  5: '🚀',
};

export const ENERGY_LABELS: Record<number, string> = {
  1: 'Ingen energi',
  2: 'Trött',
  3: 'Okej',
  4: 'Bra energi',
  5: 'Grym energi',
};

export const MOOD_LABELS: Record<number, string> = {
  1: 'Dålig dag',
  2: 'Seg',
  3: 'Neutral',
  4: 'Bra',
  5: 'Fantastisk',
};

export const STRESS_LABELS: Record<number, string> = {
  1: 'Ingen stress',
  2: 'Lite stress',
  3: 'Måttlig',
  4: 'Hög',
  5: 'Väldigt stressad',
};

export const PROJECT_STATUS_LABELS = {
  active: 'Aktiv',
  archived: 'Arkiverad',
  paused: 'Pausad',
} as const;

export const GOAL_STATUS_LABELS = {
  active: 'Aktiv',
  completed: 'Klar',
  paused: 'Pausad',
  abandoned: 'Övergiven',
} as const;

export const WORKLOAD_LABELS = {
  green: 'Balanserad (0–5 h)',
  yellow: 'Hög belastning (5–7 h)',
  red: 'Överbelastad (7+ h)',
} as const;

export const SLEEP_FIELD_LABELS: Record<string, string> = {
  source: 'Källa',
  date: 'Datum',
  bedtime: 'Läggtid',
  wake_time: 'Uppvakning',
  time_in_bed_minutes: 'Tid i sängen',
  actual_sleep_minutes: 'Verklig sovtid',
  sleep_score: 'Sömnpoäng',
  overall_rating: 'Helhetsbetyg',
  deep_sleep_minutes: 'Djupsömn',
  deep_sleep_rating: 'Djupsömn (betyg)',
  rem_sleep_minutes: 'REM-sömn',
  rem_sleep_rating: 'REM-sömn (betyg)',
  light_sleep_minutes: 'Lätt sömn',
  awake_minutes: 'Vaken tid',
  sleep_efficiency_percent: 'Sömn effektivitet',
  sleep_spo2_percent: 'Syremättnad (SpO2)',
  snoring_minutes: 'Snarkning',
  snoring_detected: 'Snarkning upptäckt',
  sleep_avg_heart_rate: 'Medelpuls',
  sleep_min_heart_rate: 'Lägsta puls',
  sleep_max_heart_rate: 'Högsta puls',
};

export const SLEEP_MINUTE_FIELDS = new Set([
  'time_in_bed_minutes',
  'actual_sleep_minutes',
  'deep_sleep_minutes',
  'rem_sleep_minutes',
  'light_sleep_minutes',
  'awake_minutes',
  'snoring_minutes',
]);
