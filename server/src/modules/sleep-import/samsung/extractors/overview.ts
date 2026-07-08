import {
  emptyField,
  extractDate,
  extractDurationAfterLabel,
  extractRatingAfterLabel,
  extractTimeAfterLabel,
  field,
  normalizeLines,
  normalizeOcrText,
  RATING_WORDS,
  type FieldResult,
} from '../shared.js';
import { extractSleepScore } from './sleepScore.js';

export function extractOverviewScreen(rawText: string): Record<string, FieldResult<unknown>> {
  const text = normalizeOcrText(rawText);
  const lines = normalizeLines(rawText);

  const overallRating = extractOverallRating(text, lines);
  const bedtimeLabeled = extractTimeAfterLabel(
    text,
    [/gick och la mig/i, /l[äa]ggtid/i, /bedtime/i, /somnade/i],
    96
  );
  const wakeTimeLabeled = extractTimeAfterLabel(
    text,
    [/vaknade/i, /uppvakning/i, /uppstigning/i, /wake/i],
    96
  );

  return {
    date: extractDate(text),
    sleep_score: extractSleepScore(text, lines),
    overall_rating: overallRating,
    time_in_bed_minutes: extractDurationAfterLabel(text, [/tid i s[äa]ngen/i, /time in bed/i], 97),
    actual_sleep_minutes: extractDurationAfterLabel(text, [/verklig sovtid/i, /actual sleep/i], 97),
    bedtime: bedtimeLabeled,
    wake_time: wakeTimeLabeled,
  };
}

function extractOverallRating(text: string, lines: string[]): FieldResult<string> {
  for (const line of lines.slice(0, 10)) {
    const lower = line.toLowerCase();
    if (lower.includes('sömnpoäng') || lower.includes('tid i sängen')) continue;
    for (const word of RATING_WORDS) {
      if (lower === word || lower.endsWith(` ${word}`)) {
        const value = word === 'obs!' ? 'Obs!' : word.charAt(0).toUpperCase() + word.slice(1);
        return field(value, 88);
      }
    }
  }

  return extractRatingAfterLabel(text, [/helhetsbetyg/i, /overall/i], 90);
}
