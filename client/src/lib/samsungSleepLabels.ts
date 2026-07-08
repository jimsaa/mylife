import { formatMinutes } from './format';

export interface SamsungPreviewField {
  key: string;
  label: string;
  format: (value: unknown) => string;
  percentKey?: string;
}

export interface SamsungPreviewGroup {
  title: string;
  fields: SamsungPreviewField[];
}

const overviewFields: SamsungPreviewField[] = [
  { key: 'sleep_score', label: 'Sömnpoäng', format: (v) => String(v ?? '') },
  { key: 'time_in_bed_minutes', label: 'Tid i säng', format: (v) => formatMinutes(v as number | null) },
  {
    key: 'actual_sleep_minutes',
    label: 'Verklig sovtid',
    format: (v) => formatMinutes(v as number | null),
  },
  { key: 'bedtime', label: 'Läggtid', format: (v) => String(v ?? '') },
  { key: 'wake_time', label: 'Uppstigning', format: (v) => String(v ?? '') },
  { key: 'overall_rating', label: 'Helhetsbetyg', format: (v) => String(v ?? '') },
];

const factorFields: SamsungPreviewField[] = [
  { key: 'actual_sleep_rating', label: 'Verklig sovtid', format: (v) => String(v ?? '') },
  { key: 'deep_sleep_rating', label: 'Djupsömn', format: (v) => String(v ?? '') },
  { key: 'rem_rating', label: 'REM', format: (v) => String(v ?? '') },
  { key: 'restfulness_rating', label: 'Vila', format: (v) => String(v ?? '') },
  { key: 'sleep_latency_rating', label: 'Sömnlatens', format: (v) => String(v ?? '') },
];

const stageFields: SamsungPreviewField[] = [
  { key: 'awake_minutes', label: 'Vaken', format: (v) => formatMinutes(v as number | null), percentKey: 'awake_percent' },
  { key: 'rem_sleep_minutes', label: 'REM', format: (v) => formatMinutes(v as number | null), percentKey: 'rem_percent' },
  { key: 'light_sleep_minutes', label: 'Lätt', format: (v) => formatMinutes(v as number | null), percentKey: 'light_percent' },
  { key: 'deep_sleep_minutes', label: 'Djup', format: (v) => formatMinutes(v as number | null), percentKey: 'deep_percent' },
];

const oxygenFields: SamsungPreviewField[] = [
  { key: 'sleep_spo2_min', label: 'Syre min', format: (v) => (v ? `${v}%` : '') },
  { key: 'sleep_spo2_avg', label: 'Syre snitt', format: (v) => (v ? `${v}%` : '') },
  { key: 'sleep_spo2_max', label: 'Syre max', format: (v) => (v ? `${v}%` : '') },
];

export const SAMSUNG_PREVIEW_GROUPS: SamsungPreviewGroup[] = [
  { title: 'Översikt', fields: overviewFields },
  { title: 'Sömnfaktorer', fields: factorFields },
  { title: 'Sömnstadier', fields: stageFields },
  { title: 'Syre', fields: oxygenFields },
];

export const SAMSUNG_PREVIEW_FIELDS: SamsungPreviewField[] = [
  ...overviewFields,
  ...factorFields,
  ...stageFields,
  ...oxygenFields,
];

export const SAMSUNG_EDITABLE_FIELDS = [
  'date',
  'sleep_score',
  'time_in_bed_minutes',
  'actual_sleep_minutes',
  'bedtime',
  'wake_time',
  'rem_sleep_minutes',
  'light_sleep_minutes',
  'deep_sleep_minutes',
  'awake_minutes',
  'overall_rating',
  'actual_sleep_rating',
  'deep_sleep_rating',
  'rem_rating',
  'restfulness_rating',
  'sleep_latency_rating',
  'sleep_spo2_min',
  'sleep_spo2_avg',
  'sleep_spo2_max',
] as const;

export const MAX_SAMSUNG_IMAGES = 3;
export const RECOMMENDED_SAMSUNG_IMAGES = 3;
export const CONFIDENCE_HIGHLIGHT_THRESHOLD = 80;
export const CONFIDENCE_CONFIRM_THRESHOLD = 60;
