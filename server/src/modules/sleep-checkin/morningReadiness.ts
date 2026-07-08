import type { MorningReadiness, MorningReadinessLabel } from '../sleep-import/samsung/morningReadiness.js';

export interface DailySleepCheckinInput {
  sleep_score: number;
  actual_sleep_minutes: number;
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  morning_energy: number;
}

const LABELS: Array<{ min: number; label: MorningReadinessLabel; emoji: string }> = [
  { min: 75, label: 'Redo för fokus', emoji: '🟢' },
  { min: 55, label: 'Normal dag', emoji: '🟡' },
  { min: 35, label: 'Ta det lugnare idag', emoji: '🟠' },
  { min: 0, label: 'Återhämtning prioriteras', emoji: '🔴' },
];

function energyPoints(level: number): number {
  const map: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };
  return map[level] ?? 50;
}

/**
 * Weighted readiness from the five daily check-in fields.
 * Morning energy is weighted highest — subjective readiness beats device metrics.
 * Not medical advice — personal life metric for daily planning.
 */
export function calculateDailySleepCheckinReadiness(input: DailySleepCheckinInput): MorningReadiness {
  const factors: string[] = [];
  let total = 0;
  let weight = 0;

  total += input.sleep_score * 0.3;
  weight += 0.3;
  factors.push(`Sömnpoäng ${input.sleep_score}`);

  const sleepHours = input.actual_sleep_minutes / 60;
  const sleepPoints = sleepHours >= 7 ? 90 : sleepHours >= 6 ? 70 : sleepHours >= 5 ? 50 : 25;
  total += sleepPoints * 0.15;
  weight += 0.15;
  factors.push(`Verklig sovtid ${sleepHours.toFixed(1)} h`);

  const deepPoints =
    input.deep_sleep_minutes >= 90 ? 90 : input.deep_sleep_minutes >= 60 ? 70 : 45;
  total += deepPoints * 0.1;
  weight += 0.1;

  const remPoints = input.rem_sleep_minutes >= 90 ? 90 : input.rem_sleep_minutes >= 60 ? 70 : 45;
  total += remPoints * 0.1;
  weight += 0.1;

  const energy = energyPoints(input.morning_energy);
  total += energy * 0.35;
  weight += 0.35;
  factors.push(`Morgonenergi ${input.morning_energy}/5`);

  const score = weight > 0 ? Math.round(total / weight) : 0;
  const band = LABELS.find((entry) => score >= entry.min) ?? LABELS[LABELS.length - 1];

  return {
    score,
    label: band.label,
    emoji: band.emoji,
    factors,
  };
}
