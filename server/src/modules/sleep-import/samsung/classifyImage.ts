import { normalizeLines, normalizeOcrText } from './shared.js';

export type SamsungImageType =
  | 'overview'
  | 'sleep_factors'
  | 'sleep_stages'
  | 'blood_oxygen'
  | 'unknown';

interface ClassificationResult {
  image_type: SamsungImageType;
  confidence: number;
}

function scorePattern(text: string, patterns: RegExp[], weight: number): number {
  return patterns.reduce((sum, pattern) => (pattern.test(text) ? sum + weight : sum), 0);
}

/** Classify Samsung Health screenshot OCR into a screen type. */
export function classifySamsungImage(rawText: string): ClassificationResult {
  const text = normalizeOcrText(rawText).toLowerCase();
  const lines = normalizeLines(rawText).join('\n').toLowerCase();

  const scores: Record<SamsungImageType, number> = {
    overview: 0,
    sleep_factors: 0,
    sleep_stages: 0,
    blood_oxygen: 0,
    unknown: 0,
  };

  scores.overview += scorePattern(text, [
    /s[öo]mnpo[äa]ng/,
    /tid i s[äa]ngen/,
    /verklig sovtid/,
    /gick och la mig/,
    /vaknade/,
    /uppstigning/,
  ], 3);

  scores.sleep_factors += scorePattern(text, [
    /s[öo]mnfaktor/,
    /insomn/,
    /s[öo]mnlatens/,
    /[åa]terh[äa]mtning/,
  ], 4);

  scores.sleep_factors += scorePattern(lines, [/vila[\s\S]{0,20}(obs!|bra|utm)/], 2);

  scores.sleep_stages += scorePattern(text, [
    /s[öo]mnstadier/,
    /l[äa]tt s[öo]mn/,
    /\bvaken\b/,
    /djups[öo]mn[\s\S]{0,40}\d+\s*%/,
  ], 4);

  scores.blood_oxygen += scorePattern(text, [/syre/i, /spo2/i, /blood oxygen/i, /syrgas/i], 5);

  const ranked = Object.entries(scores)
    .filter(([type]) => type !== 'unknown')
    .sort((a, b) => b[1] - a[1]);

  const [bestType, bestScore] = ranked[0] ?? ['unknown', 0];
  const secondScore = ranked[1]?.[1] ?? 0;

  if (bestScore < 3 || bestScore === secondScore) {
    return { image_type: 'unknown', confidence: 40 };
  }

  const confidence = Math.min(98, 60 + bestScore * 5);
  return { image_type: bestType as SamsungImageType, confidence };
}
