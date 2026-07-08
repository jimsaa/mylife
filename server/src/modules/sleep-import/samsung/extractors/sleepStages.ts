import {
  extractDurationAfterLabel,
  extractPercentAfterLabel,
  fixOcrDuration,
  type FieldResult,
} from '../shared.js';
import { parseDurationToMinutes, parseInteger } from '../../parsers.js';
import { normalizeOcrText } from '../shared.js';

interface StageExtraction {
  minutes: FieldResult<number>;
  percent: FieldResult<number>;
}

function extractStage(text: string, labels: RegExp[]): StageExtraction {
  for (const label of labels) {
    const block = text.match(
      new RegExp(`${label.source}[\\s\\S]{0,80}?(\\d+[\\soOl\\s]*h?\\s*\\d*[\\soOl\\s]*m?)[\\s\\S]{0,30}?(\\d{1,3})\\s*%`, 'i')
    );
    if (block) {
      const mins = parseDurationToMinutes(fixOcrDuration(block[1]));
      const pct = parseInteger(block[2]);
      return {
        minutes: mins !== null ? { value: mins, confidence: 96 } : { value: null, confidence: 0 },
        percent: pct !== null && pct <= 100 ? { value: pct, confidence: 95 } : { value: null, confidence: 0 },
      };
    }
  }

  return {
    minutes: extractDurationAfterLabel(text, labels, 94),
    percent: extractPercentAfterLabel(text, labels),
  };
}

export function extractSleepStagesScreen(rawText: string): Record<string, FieldResult<unknown>> {
  const text = normalizeOcrText(rawText);

  const awake = extractStage(text, [/\bvaken\b/i, /\bawake\b/i]);
  const rem = extractStage(text, [/rem[\s-]?s[öo]mn/i, /rem sleep/i]);
  const light = extractStage(text, [/l[äa]tt s[öo]mn/i, /light sleep/i]);
  const deep = extractStage(text, [/djups[öo]mn/i, /deep sleep/i]);

  return {
    awake_minutes: awake.minutes,
    awake_percent: awake.percent,
    rem_sleep_minutes: rem.minutes,
    rem_percent: rem.percent,
    light_sleep_minutes: light.minutes,
    light_percent: light.percent,
    deep_sleep_minutes: deep.minutes,
    deep_percent: deep.percent,
  };
}
