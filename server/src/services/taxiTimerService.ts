import { getSetting, setSetting } from './settingsService.js';
import { createTaxiShift } from './taxiService.js';
import type { TaxiShift } from '../types/index.js';
import { todayIso } from './utils.js';

const TAXI_TIMER_KEY = 'active_taxi_timer';

export interface ActiveTaxiTimer {
  start_time: string;
  shift_date: string;
  paused_at: string | null;
  accumulated_pause_ms: number;
}

function toLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getActiveTaxiTimer(): ActiveTaxiTimer | null {
  const raw = getSetting(TAXI_TIMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveTaxiTimer;
  } catch {
    return null;
  }
}

export function getTaxiTimerElapsedMs(timer: ActiveTaxiTimer, now = Date.now()): number {
  const start = new Date(timer.start_time).getTime();
  const extraPause = timer.paused_at
    ? now - new Date(timer.paused_at).getTime()
    : 0;
  return Math.max(0, now - start - timer.accumulated_pause_ms - extraPause);
}

export function startTaxiTimer(): ActiveTaxiTimer {
  const existing = getActiveTaxiTimer();
  if (existing) {
    throw new Error('taxi_timer_active');
  }

  const timer: ActiveTaxiTimer = {
    start_time: new Date().toISOString(),
    shift_date: todayIso(),
    paused_at: null,
    accumulated_pause_ms: 0,
  };
  setSetting(TAXI_TIMER_KEY, JSON.stringify(timer));
  return timer;
}

export function pauseTaxiTimer(): ActiveTaxiTimer | null {
  const timer = getActiveTaxiTimer();
  if (!timer || timer.paused_at) return timer;
  timer.paused_at = new Date().toISOString();
  setSetting(TAXI_TIMER_KEY, JSON.stringify(timer));
  return timer;
}

export function resumeTaxiTimer(): ActiveTaxiTimer | null {
  const timer = getActiveTaxiTimer();
  if (!timer || !timer.paused_at) return timer;
  const pauseDuration = Date.now() - new Date(timer.paused_at).getTime();
  timer.accumulated_pause_ms += pauseDuration;
  timer.paused_at = null;
  setSetting(TAXI_TIMER_KEY, JSON.stringify(timer));
  return timer;
}

export function stopTaxiTimer(): TaxiShift | null {
  const timer = getActiveTaxiTimer();
  if (!timer) return null;

  const endTime = new Date().toISOString();
  const elapsedMs = getTaxiTimerElapsedMs(timer, Date.now());
  const hoursWorked = Math.round((elapsedMs / 3600000) * 100) / 100;

  const shift = createTaxiShift({
    shift_date: timer.shift_date,
    shift_start: toLocalTime(timer.start_time),
    shift_end: toLocalTime(endTime),
    hours_worked: hoursWorked,
    shift_type: 'Taxi Pass',
    notes: null,
  });

  setSetting(TAXI_TIMER_KEY, '');
  return shift;
}

export function getTaxiTimerStatus(): {
  active: boolean;
  paused: boolean;
  timer: ActiveTaxiTimer | null;
  elapsed_seconds: number;
} {
  const timer = getActiveTaxiTimer();
  if (!timer) {
    return { active: false, paused: false, timer: null, elapsed_seconds: 0 };
  }

  return {
    active: true,
    paused: !!timer.paused_at,
    timer,
    elapsed_seconds: Math.floor(getTaxiTimerElapsedMs(timer) / 1000),
  };
}

export function getActiveTaxiTimerHours(): number {
  const timer = getActiveTaxiTimer();
  if (!timer || timer.shift_date !== todayIso()) return 0;
  return Math.round((getTaxiTimerElapsedMs(timer) / 3600000) * 100) / 100;
}
