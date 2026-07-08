import { KNOWN_SLEEP_FIELDS, slugifyMetricName } from './fieldMapping.js';
import {
  parseBoolean,
  parseDateToIso,
  parseDurationToMinutes,
  parseInteger,
  parsePercent,
  parseTimeValue,
} from './parsers.js';
import type { ExtractedSleepData, SleepMetricInput } from './types.js';

const DURATION_FIELDS = new Set([
  'time_in_bed_minutes',
  'actual_sleep_minutes',
  'deep_sleep_minutes',
  'rem_sleep_minutes',
  'light_sleep_minutes',
  'awake_minutes',
  'snoring_minutes',
]);

const PERCENT_FIELDS = new Set(['sleep_efficiency_percent', 'sleep_spo2_percent']);
const INTEGER_FIELDS = new Set([
  'sleep_score',
  'sleep_avg_heart_rate',
  'sleep_min_heart_rate',
  'sleep_max_heart_rate',
]);
const TIME_FIELDS = new Set(['bedtime', 'wake_time']);
const RATING_TEXT_FIELDS = new Set(['overall_rating', 'deep_sleep_rating', 'rem_sleep_rating']);

function emptyExtracted(method: string, confidence: number, rawText?: string): ExtractedSleepData {
  return {
    source: null,
    date: null,
    bedtime: null,
    wake_time: null,
    time_in_bed_minutes: null,
    actual_sleep_minutes: null,
    sleep_score: null,
    overall_rating: null,
    deep_sleep_minutes: null,
    deep_sleep_rating: null,
    rem_sleep_minutes: null,
    rem_sleep_rating: null,
    light_sleep_minutes: null,
    awake_minutes: null,
    sleep_efficiency_percent: null,
    sleep_spo2_percent: null,
    snoring_minutes: null,
    snoring_detected: null,
    sleep_avg_heart_rate: null,
    sleep_min_heart_rate: null,
    sleep_max_heart_rate: null,
    unknown_metrics: [],
    extraction_method: method,
    extraction_confidence: confidence,
    raw_text: rawText ?? null,
  };
}

function normalizeField(key: string, value: unknown): unknown {
  if (value === null || value === undefined || value === '') return null;

  if (key === 'date') return parseDateToIso(String(value));
  if (TIME_FIELDS.has(key)) return parseTimeValue(String(value));
  if (DURATION_FIELDS.has(key)) return parseDurationToMinutes(value as string | number);
  if (PERCENT_FIELDS.has(key)) return parsePercent(value as string | number);
  if (INTEGER_FIELDS.has(key)) return parseInteger(value as string | number);
  if (key === 'snoring_detected') return parseBoolean(value);
  if (RATING_TEXT_FIELDS.has(key)) return String(value).trim();

  return value;
}

export function normalizeExtractedPayload(
  payload: Record<string, unknown>,
  method: string,
  confidence: number,
  rawText?: string
): ExtractedSleepData {
  const result = emptyExtracted(method, confidence, rawText);
  const unknown: SleepMetricInput[] = [];

  for (const [rawKey, rawValue] of Object.entries(payload)) {
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;

    const key = rawKey.trim();

    if (key === 'unknown_metrics' && Array.isArray(rawValue)) {
      for (const item of rawValue) {
        if (!item || typeof item !== 'object') continue;
        const metric = item as Record<string, unknown>;
        unknown.push({
          metric_name: String(metric.metric_name ?? slugifyMetricName(String(metric.original_label ?? 'metric'))),
          metric_value: String(metric.metric_value ?? metric.value ?? ''),
          metric_unit: metric.metric_unit ? String(metric.metric_unit) : null,
          original_label: String(metric.original_label ?? metric.label ?? metric.metric_name ?? 'Unknown'),
        });
      }
      continue;
    }

    if (KNOWN_SLEEP_FIELDS.has(key)) {
      (result as Record<string, unknown>)[key] = normalizeField(key, rawValue);
      continue;
    }

    unknown.push({
      metric_name: slugifyMetricName(key),
      metric_value: String(rawValue),
      metric_unit: null,
      original_label: key,
    });
  }

  result.unknown_metrics = unknown;
  return result;
}

/** Heuristic extraction from OCR plain text. */
export function extractFromText(rawText: string): ExtractedSleepData {
  const text = rawText.replace(/\s+/g, ' ');
  const payload: Record<string, unknown> = { source: 'screenshot_ocr' };
  let matchedFields = 0;

  const patterns: { field: string; regex: RegExp; transform?: (m: RegExpMatchArray) => unknown }[] = [
    {
      field: 'date',
      regex: /(\d{1,2}\s+(?:januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+\d{4})/i,
    },
    { field: 'date', regex: /(\d{4}-\d{2}-\d{2})/ },
    { field: 'date', regex: /(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?)/ },
    {
      field: 'actual_sleep_minutes',
      regex: /(?:verklig sovtid|actual sleep)[:\s]*(\d+\s*h?\s*\d*\s*m?)/i,
      transform: (m) => parseDurationToMinutes(m[1]),
    },
    {
      field: 'time_in_bed_minutes',
      regex: /(?:tid i sängen|time in bed|total sleep|sovtid)[:\s]*(\d+\s*h?\s*\d*\s*m?)/i,
      transform: (m) => parseDurationToMinutes(m[1]),
    },
    {
      field: 'deep_sleep_minutes',
      regex: /(?:djupsömn|deep sleep)[:\s]*(\d+\s*h?\s*\d*\s*m?|\d+\s*min)/i,
      transform: (m) => parseDurationToMinutes(m[1]),
    },
    {
      field: 'rem_sleep_minutes',
      regex: /(?:rem[- ]?sömn|rem sleep)[:\s]*(\d+\s*h?\s*\d*\s*m?|\d+\s*min)/i,
      transform: (m) => parseDurationToMinutes(m[1]),
    },
    {
      field: 'light_sleep_minutes',
      regex: /(?:lätt sömn|light sleep)[:\s]*(\d+\s*h?\s*\d*\s*m?|\d+\s*min)/i,
      transform: (m) => parseDurationToMinutes(m[1]),
    },
    {
      field: 'awake_minutes',
      regex: /(?:vaken|awake)[:\s]*(\d+\s*h?\s*\d*\s*m?|\d+\s*min)/i,
      transform: (m) => parseDurationToMinutes(m[1]),
    },
    {
      field: 'sleep_score',
      regex: /(?:sömnpoäng|sleep score)[:\s]*(\d+)/i,
      transform: (m) => parseInt(m[1], 10),
    },
    {
      field: 'sleep_efficiency_percent',
      regex: /(?:sleep efficiency|sömn effektivitet|efficiency)[:\s]*(\d+)\s*%/i,
      transform: (m) => parseInt(m[1], 10),
    },
    {
      field: 'sleep_spo2_percent',
      regex: /(?:spo2|blood oxygen|syre)[:\s]*(\d+)\s*%/i,
      transform: (m) => parseInt(m[1], 10),
    },
    {
      field: 'snoring_minutes',
      regex: /(?:snarkning|snoring)[:\s]*(\d+\s*min)/i,
      transform: (m) => parseDurationToMinutes(m[1]),
    },
    {
      field: 'snoring_detected',
      regex: /(snoring detected|snarkning upptäckt)/i,
      transform: () => true,
    },
    {
      field: 'sleep_avg_heart_rate',
      regex: /(?:average hr|avg hr|average heart rate|medelpuls|genomsnittlig puls)[:\s]*(\d+)/i,
      transform: (m) => parseInt(m[1], 10),
    },
    {
      field: 'sleep_min_heart_rate',
      regex: /(?:lowest hr|min hr|lägsta puls)[:\s]*(\d+)/i,
      transform: (m) => parseInt(m[1], 10),
    },
    {
      field: 'sleep_max_heart_rate',
      regex: /(?:highest hr|max hr|högsta puls)[:\s]*(\d+)/i,
      transform: (m) => parseInt(m[1], 10),
    },
    {
      field: 'bedtime',
      regex: /(?:bedtime|läggtid)[:\s]*(\d{1,2}[:.]\d{2})/i,
      transform: (m) => parseTimeValue(m[1]),
    },
    {
      field: 'wake_time',
      regex: /(?:wake time|uppvakning|woke up)[:\s]*(\d{1,2}[:.]\d{2})/i,
      transform: (m) => parseTimeValue(m[1]),
    },
    {
      field: 'overall_rating',
      regex: /\b(utmärkt|ganska bra|bra|dålig|excellent|good|fair|poor)\b/i,
      transform: (m) => m[1],
    },
  ];

  for (const pattern of patterns) {
    if (payload[pattern.field]) continue;
    const match = text.match(pattern.regex);
    if (!match) continue;
    payload[pattern.field] = pattern.transform ? pattern.transform(match) : match[1];
    matchedFields += 1;
  }

  const durationFallback = text.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (!payload.time_in_bed_minutes && durationFallback) {
    payload.time_in_bed_minutes = parseDurationToMinutes(`${durationFallback[1]} h ${durationFallback[2]} m`);
    matchedFields += 1;
  }

  const confidence = Math.min(0.85, 0.25 + matchedFields * 0.08);
  return normalizeExtractedPayload(payload, 'ocr_heuristic', confidence, rawText);
}

export function mergeExtractedResults(primary: ExtractedSleepData, secondary: ExtractedSleepData): ExtractedSleepData {
  const merged = { ...primary };
  for (const key of KNOWN_SLEEP_FIELDS) {
    const current = (merged as Record<string, unknown>)[key];
    const fallback = (secondary as Record<string, unknown>)[key];
    if ((current === null || current === undefined || current === '') && fallback !== null && fallback !== undefined) {
      (merged as Record<string, unknown>)[key] = fallback;
    }
  }

  const metricKeys = new Set(merged.unknown_metrics.map((m) => m.metric_name));
  for (const metric of secondary.unknown_metrics) {
    if (!metricKeys.has(metric.metric_name)) merged.unknown_metrics.push(metric);
  }

  merged.extraction_confidence = Math.max(primary.extraction_confidence, secondary.extraction_confidence);
  merged.raw_text = primary.raw_text ?? secondary.raw_text ?? null;
  return merged;
}

export { emptyExtracted };
