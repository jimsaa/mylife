import { getSetting, setSetting } from './settingsService.js';
import { createTimeEntry, getRunningTimeEntry, stopTimeEntry } from './timeEntryService.js';
import type { ActiveTimer, TimeEntry } from '../types/index.js';

const TIMER_KEY = 'active_timer';

export function getActiveTimer(): ActiveTimer | null {
  const raw = getSetting(TIMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveTimer;
  } catch {
    return null;
  }
}

export function startTimer(projectId: number | null, notes?: string | null): TimeEntry {
  const running = getRunningTimeEntry();
  if (running) {
    stopTimeEntry(running.id);
  }

  const start_time = new Date().toISOString();
  const entry = createTimeEntry({ project_id: projectId, start_time, notes: notes ?? null });

  const timer: ActiveTimer = {
    project_id: projectId,
    start_time,
    paused_at: null,
    accumulated_pause_ms: 0,
    notes: notes ?? null,
  };
  setSetting(TIMER_KEY, JSON.stringify({ ...timer, entry_id: entry.id }));
  return entry;
}

export function pauseTimer(): ActiveTimer | null {
  const timer = getActiveTimer();
  if (!timer || timer.paused_at) return timer;
  timer.paused_at = new Date().toISOString();
  setSetting(TIMER_KEY, JSON.stringify(timer));
  return timer;
}

export function resumeTimer(): ActiveTimer | null {
  const timer = getActiveTimer();
  if (!timer || !timer.paused_at) return timer;
  const pauseDuration = new Date().getTime() - new Date(timer.paused_at).getTime();
  timer.accumulated_pause_ms += pauseDuration;
  timer.paused_at = null;
  setSetting(TIMER_KEY, JSON.stringify(timer));
  return timer;
}

export function stopTimer(): TimeEntry | null {
  const timerRaw = getSetting(TIMER_KEY);
  if (!timerRaw) return null;

  let timer: ActiveTimer & { entry_id?: number };
  try {
    timer = JSON.parse(timerRaw);
  } catch {
    setSetting(TIMER_KEY, '');
    return null;
  }

  const running = getRunningTimeEntry();
  if (!running) {
    setSetting(TIMER_KEY, '');
    return null;
  }

  const end_time = new Date().toISOString();
  const entry = stopTimeEntry(running.id, end_time);
  setSetting(TIMER_KEY, '');
  return entry;
}

export function getTimerStatus(): {
  active: boolean;
  paused: boolean;
  entry: TimeEntry | null;
  timer: ActiveTimer | null;
} {
  const timer = getActiveTimer();
  const entry = getRunningTimeEntry();
  return {
    active: !!entry,
    paused: !!timer?.paused_at,
    entry,
    timer,
  };
}
