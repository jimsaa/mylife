import { parseInteger } from '../../parsers.js';
import { emptyField, field, normalizeLines, type FieldResult } from '../shared.js';

const POSITIVE_OVERALL = ['bra', 'ganska bra', 'utmärkt'];

/** Dedicated sleep score extraction — avoids mascot/date/percent false positives. */
export function extractSleepScore(text: string, lines: string[]): FieldResult<number> {
  const normalized = text.toLowerCase();
  const scoreIndex = lines.findIndex((line) => /s[öo]mnpo[äa]ng/i.test(line));

  if (scoreIndex >= 0) {
    const windowLines = lines.slice(scoreIndex, scoreIndex + 8);

    for (const line of windowLines) {
      const inline = line.match(/s[öo]mnpo[äa]ng[\s:]*(\d{2,3})\b/i);
      if (inline) {
        const value = parseInteger(inline[1]);
        if (isValidSleepScore(value)) return field(value, 98);
      }

      const standalone = line.match(/^\s*(\d{2,3})\s*$/);
      if (standalone) {
        const value = parseInteger(standalone[1]);
        if (isValidSleepScore(value)) return field(value, 97);
      }
    }

    const windowText = windowLines.join('\n');
    const candidates = [...windowText.matchAll(/\b(\d{2,3})\b/g)]
      .map((match) => parseInteger(match[1]))
      .filter((value): value is number => value !== null && isValidSleepScore(value))
      .filter((value) => !windowText.includes(`${value}%`));

    if (candidates.length > 0) {
      const best = Math.max(...candidates);
      return field(best, 93);
    }
  }

  const labeled = normalized.match(/s[öo]mnpo[äa]ng[\s:]*(\d{2,3})/i);
  if (labeled) {
    const value = parseInteger(labeled[1]);
    if (isValidSleepScore(value)) return field(value, 90);
  }

  return emptyField<number>();
}

export function extractSleepScoreRetry(text: string, lines: string[]): FieldResult<number> {
  const scoreIndex = lines.findIndex((line) => /s[öo]mnpo[äa]ng/i.test(line));
  if (scoreIndex < 0) return emptyField<number>();

  const region = lines.slice(Math.max(0, scoreIndex - 2), scoreIndex + 12).join('\n');
  const candidates = [...region.matchAll(/\b(\d{2,3})\b/g)]
    .map((match) => parseInteger(match[1]))
    .filter((value): value is number => value !== null && value >= 30 && value <= 100)
    .filter((value) => !region.includes(`${value}%`) && !region.match(new RegExp(`${value}[:.]`)));

  if (!candidates.length) return emptyField<number>();
  return field(Math.max(...candidates), 85);
}

function isValidSleepScore(value: number | null): value is number {
  return value !== null && value >= 0 && value <= 100;
}

export function isSuspiciousSleepScore(
  sleepScore: number | null,
  overallRating: string | null
): boolean {
  if (sleepScore === null || sleepScore >= 30) return false;
  if (!overallRating) return false;
  return POSITIVE_OVERALL.includes(overallRating.toLowerCase());
}
