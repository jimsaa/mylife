/**
 * In-process Digital Legacy scheduler.
 * Runs hourly. Production can also hit POST /api/legacy/public/cron with LEGACY_CRON_SECRET.
 */
import { runLegacySchedulerTick } from '../../services/legacyService.js';

const HOUR_MS = 60 * 60 * 1000;

let timer: ReturnType<typeof setInterval> | null = null;

export function startLegacyScheduler(): void {
  if (timer) return;
  if (process.env.LEGACY_SCHEDULER === '0') {
    console.log('[legacy] In-process scheduler disabled (LEGACY_SCHEDULER=0)');
    return;
  }

  const tick = async () => {
    try {
      const result = await runLegacySchedulerTick();
      if (result.actions.some((a) => a !== 'noop' && a !== 'disabled')) {
        console.log('[legacy] scheduler:', result.actions.join(', '));
      }
    } catch (err) {
      console.error('[legacy] scheduler error:', err);
    }
  };

  // Delay first run slightly after boot
  setTimeout(() => {
    void tick();
  }, 15_000);

  timer = setInterval(() => {
    void tick();
  }, HOUR_MS);

  console.log('[legacy] In-process scheduler started (hourly)');
}

export function stopLegacyScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
