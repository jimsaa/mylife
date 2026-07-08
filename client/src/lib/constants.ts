export const APP_NAME = 'My Life';

export const NAV_ITEMS = [
  { path: '/', label: 'Översikt' },
  { path: '/kalender', label: 'Kalender' },
  { path: '/tid', label: 'Tid' },
  { path: '/projekt', label: 'Projekt' },
  { path: '/statistik', label: 'Statistik' },
  { path: '/journal', label: 'Journal' },
  { path: '/valbefinnande', label: 'Välbefinnande' },
  { path: '/somn', label: 'Sömn' },
  { path: '/mat', label: 'Mat' },
  { path: '/taxi', label: 'Taxi' },
  { path: '/mal', label: 'Mål' },
  { path: '/installningar', label: 'Inställningar' },
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
