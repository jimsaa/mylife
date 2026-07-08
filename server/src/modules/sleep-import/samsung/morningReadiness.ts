import type { SamsungSleepExtracted } from './types.js';

export type MorningReadinessLabel =
  | 'Redo för fokus'
  | 'Normal dag'
  | 'Ta det lugnare idag'
  | 'Återhämtning prioriteras';

export interface MorningReadiness {
  score: number;
  label: MorningReadinessLabel;
  emoji: string;
  factors: string[];
}

const LABELS: Array<{ min: number; label: MorningReadinessLabel; emoji: string }> = [
  { min: 75, label: 'Redo för fokus', emoji: '🟢' },
  { min: 55, label: 'Normal dag', emoji: '🟡' },
  { min: 35, label: 'Ta det lugnare idag', emoji: '🟠' },
  { min: 0, label: 'Återhämtning prioriteras', emoji: '🔴' },
];

function ratingScore(rating: string | null, good: string[], ok: string[], bad: string[]): number {
  if (!rating) return 50;
  const lower = rating.toLowerCase();
  if (good.some((word) => lower.includes(word))) return 90;
  if (ok.some((word) => lower.includes(word))) return 65;
  if (bad.some((word) => lower.includes(word))) return 30;
  return 50;
}

/**
 * Transparent morning readiness score (0–100).
 * Not medical advice — personal life metric for daily planning.
 */
export function calculateMorningReadiness(session: SamsungSleepExtracted): MorningReadiness {
  const factors: string[] = [];
  let total = 0;
  let weight = 0;

  if (session.sleep_score !== null) {
    total += session.sleep_score * 0.35;
    weight += 0.35;
    factors.push(`Sömnpoäng ${session.sleep_score}`);
  }

  if (session.actual_sleep_minutes !== null) {
    const hours = session.actual_sleep_minutes / 60;
    const sleepPoints = hours >= 7 ? 90 : hours >= 6 ? 70 : hours >= 5 ? 50 : 25;
    total += sleepPoints * 0.2;
    weight += 0.2;
    factors.push(`Verklig sovtid ${hours.toFixed(1)} h`);
  }

  if (session.deep_sleep_minutes !== null) {
    const deepPoints = session.deep_sleep_minutes >= 90 ? 90 : session.deep_sleep_minutes >= 60 ? 70 : 45;
    total += deepPoints * 0.15;
    weight += 0.15;
  }

  if (session.rem_sleep_minutes !== null) {
    const remPoints = session.rem_sleep_minutes >= 90 ? 90 : session.rem_sleep_minutes >= 60 ? 70 : 45;
    total += remPoints * 0.1;
    weight += 0.1;
  }

  const restfulness = ratingScore(session.restfulness_rating, ['utmärkt', 'bra'], ['ganska bra'], ['obs', 'dålig']);
  total += restfulness * 0.1;
  weight += 0.1;

  const latency = ratingScore(
    session.sleep_latency_rating,
    ['utmärkt'],
    ['bra', 'ganska bra'],
    ['dålig', 'obs']
  );
  total += latency * 0.1;
  weight += 0.1;

  const score = weight > 0 ? Math.round(total / weight) : 0;
  const band = LABELS.find((entry) => score >= entry.min) ?? LABELS[LABELS.length - 1];

  return {
    score,
    label: band.label,
    emoji: band.emoji,
    factors,
  };
}
