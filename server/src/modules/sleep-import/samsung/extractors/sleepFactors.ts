import {
  capitalizeRating,
  emptyField,
  field,
  normalizeLines,
  RATING_WORDS,
  type FieldResult,
} from '../shared.js';

function extractFactorRating(lines: string[], labelPatterns: RegExp[]): FieldResult<string> {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!labelPatterns.some((pattern) => pattern.test(line))) continue;

    for (let offset = 0; offset <= 2; offset += 1) {
      const candidate = lines[index + offset]?.toLowerCase() ?? '';
      for (const word of RATING_WORDS) {
        if (candidate === word || candidate.endsWith(` ${word}`) || candidate.startsWith(`${word} `)) {
          return field(capitalizeRating(word), 96);
        }
      }
    }
  }

  return emptyField<string>();
}

export function extractSleepFactorsScreen(rawText: string): Record<string, FieldResult<unknown>> {
  const lines = normalizeLines(rawText);

  return {
    actual_sleep_rating: extractFactorRating(lines, [/verklig sovtid/i, /actual sleep/i]),
    deep_sleep_rating: extractFactorRating(lines, [/djups[öo]mn/i, /deep sleep/i]),
    rem_rating: extractFactorRating(lines, [/rem[\s-]?s[öo]mn/i, /rem sleep/i]),
    restfulness_rating: extractFactorRating(lines, [/^\s*vila\b/i, /restfulness/i, /[åa]terh[äa]mtning/i]),
    sleep_latency_rating: extractFactorRating(lines, [/insomn/i, /sleep latency/i, /s[öo]mnlatens/i]),
  };
}
