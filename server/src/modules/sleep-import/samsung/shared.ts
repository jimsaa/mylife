import {
  parseDateToIso,
  parseDurationToMinutes,
  parseInteger,
  parseTimeValue,
} from '../parsers.js';

export const RATING_WORDS = ['utmärkt', 'ganska bra', 'bra', 'dålig', 'obs!'] as const;
export const POSITIVE_RATINGS = ['bra', 'ganska bra', 'utmärkt'];

export interface FieldResult<T> {
  value: T | null;
  confidence: number;
}

export function emptyField<T>(): FieldResult<T> {
  return { value: null, confidence: 0 };
}

export function field<T>(value: T | null, confidence: number): FieldResult<T> {
  if (value === null || value === undefined || value === '') return emptyField<T>();
  return { value, confidence };
}

export function normalizeOcrText(raw: string): string {
  return raw
    .replace(/\r/g, '\n')
    .replace(/[|]/g, ' ')
    .replace(/[·•]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function fixOcrDuration(text: string): string {
  return text
    .replace(/(\d)\s*[hH]\s*(\d)/g, '$1 h $2')
    .replace(/(\d)\s*[mM]\b/g, '$1 m')
    .replace(/\bo\b/g, '0')
    .replace(/\bl\b/g, '1');
}

export function extractDurationAfterLabel(
  text: string,
  labels: RegExp[],
  confidence: number
): FieldResult<number> {
  for (const label of labels) {
    const match = text.match(
      new RegExp(`${label.source}[\\s:]*([0-9oOl\\s]+h?\\s*[0-9oOl\\s]*m?)`, 'i')
    );
    if (match) {
      const mins = parseDurationToMinutes(fixOcrDuration(match[1]));
      if (mins !== null) return field(mins, confidence);
    }
  }
  return emptyField<number>();
}

export function extractRatingAfterLabel(
  text: string,
  labels: RegExp[],
  confidence: number
): FieldResult<string> {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label.source}[\\s:]*([\\w!åäö\\s]+)`, 'i'));
    if (!match) continue;
    const fragment = match[1].toLowerCase();
    for (const word of RATING_WORDS) {
      if (fragment.includes(word)) {
        const value = word === 'obs!' ? 'Obs!' : word.charAt(0).toUpperCase() + word.slice(1);
        return field(value, confidence);
      }
    }
  }
  return emptyField<string>();
}

export function extractTimeAfterLabel(
  text: string,
  labels: RegExp[],
  confidence: number
): FieldResult<string> {
  for (const label of labels) {
    const match = text.match(new RegExp(`${label.source}[\\s:]*([0-9]{1,2}[:.][0-9]{2})`, 'i'));
    if (match) {
      const parsed = parseTimeValue(match[1]);
      if (parsed) return field(parsed, confidence);
    }
  }
  return emptyField<string>();
}

export function extractDate(text: string): FieldResult<string> {
  const swedish = text.match(
    /(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/i
  );
  if (swedish) {
    const iso = parseDateToIso(`${swedish[1]} ${swedish[2]} ${swedish[3]}`);
    return field(iso, iso ? 98 : 0);
  }

  const slash = text.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (slash) {
    const year = slash[3] ?? String(new Date().getFullYear());
    const iso = parseDateToIso(`${slash[1]}/${slash[2]}/${year}`);
    return field(iso, iso ? (slash[3] ? 94 : 86) : 0);
  }

  return emptyField<string>();
}

export function extractPercentAfterLabel(text: string, labels: RegExp[]): FieldResult<number> {
  for (const label of labels) {
    const match = text.match(
      new RegExp(`${label.source}[\\s\\S]{0,60}?(\\d{1,3})\\s*%`, 'i')
    );
    if (match) {
      const value = parseInteger(match[1]);
      if (value !== null && value >= 0 && value <= 100) return field(value, 94);
    }
  }
  return emptyField<number>();
}

export function capitalizeRating(word: string): string {
  return word === 'obs!' ? 'Obs!' : word.charAt(0).toUpperCase() + word.slice(1);
}

export { parseInteger };
