import { getDb } from '../db/connection.js';
import { getAverageEnergySince } from './wellbeingService.js';
import { getAverageSleepSince } from './sleepService.js';
import { getDailyCalories } from './foodService.js';
import { getDailyWellbeing } from './wellbeingService.js';
import { getTaxiHoursForDate } from './taxiService.js';
import { getProjectById, getProjectByName } from './projectService.js';
import { getSetting } from './settingsService.js';
import { getTotalMinutesForDate, getTotalMinutesSince } from './timeEntryService.js';
import { daysAgoIso, getWeekStart, hoursFromMinutes } from './utils.js';

function getFocusedProjectIds(): number[] {
  const raw = getSetting('focused_work_project_names');
  if (!raw) return [];
  const names = raw.split(',').map((n) => n.trim());
  const ids: number[] = [];
  for (const name of names) {
    const project = getProjectByName(name);
    if (project) ids.push(project.id);
  }
  return ids;
}

function getMostActiveProjectSince(dateIso: string): { name: string; hours: number } | null {
  const row = getDb()
    .prepare(
      `SELECT p.name, COALESCE(SUM(te.duration_minutes), 0) as mins
       FROM projects p
       INNER JOIN time_entries te ON te.project_id = p.id
         AND te.end_time IS NOT NULL AND date(te.start_time) >= ?
       GROUP BY p.id
       ORDER BY mins DESC
       LIMIT 1`
    )
    .get(dateIso) as { name: string; mins: number } | undefined;

  if (!row || row.mins <= 0) return null;
  return { name: row.name, hours: hoursFromMinutes(row.mins) };
}

function getAverageSleepBetween(startIso: string, endIso: string): number | null {
  const row = getDb()
    .prepare(
      `SELECT AVG(hours_slept) as avg FROM sleep_logs
       WHERE sleep_date >= ? AND sleep_date < ?`
    )
    .get(startIso, endIso) as { avg: number | null };
  return row.avg !== null ? Math.round(row.avg * 10) / 10 : null;
}

function countDataPoints(): number {
  const timeEntries = getDb().prepare('SELECT COUNT(*) as c FROM time_entries').get() as { c: number };
  const wellbeing = getDb().prepare('SELECT COUNT(*) as c FROM daily_wellbeing').get() as { c: number };
  const sleep = getDb().prepare('SELECT COUNT(*) as c FROM sleep_logs').get() as { c: number };
  return timeEntries.c + wellbeing.c + sleep.c;
}

export function generateMotivationalInsight(): string {
  if (countDataPoints() < 3) {
    return 'Fortsätt logga ditt liv för att få personliga insikter.';
  }

  const weekStart = getWeekStart();
  const today = new Date().toISOString().slice(0, 10);
  const focusedIds = getFocusedProjectIds();
  const focusedMins = getTotalMinutesSince(weekStart, focusedIds);
  const daysInWeek = Math.max(
    1,
    Math.ceil((new Date(today).getTime() - new Date(weekStart).getTime()) / 86400000) + 1
  );
  const avgFocusedHoursPerDay = hoursFromMinutes(focusedMins) / daysInWeek;

  if (avgFocusedHoursPerDay >= 3.5 && avgFocusedHoursPerDay <= 5.5) {
    return 'Du ligger nära ditt mål på 4–5 fokuserade timmar.';
  }

  const thisWeekSleep = getAverageSleepSince(weekStart);
  const prevWeekStart = daysAgoIso(14);
  const prevWeekEnd = weekStart;
  const lastWeekSleep = getAverageSleepBetween(prevWeekStart, prevWeekEnd);
  if (thisWeekSleep && lastWeekSleep && thisWeekSleep > lastWeekSleep + 0.3) {
    return 'Du har sovit bättre än förra veckan.';
  }

  const todayHours = hoursFromMinutes(getTotalMinutesForDate(today));
  if (todayHours > 0 && todayHours <= 5) {
    return 'Bra balans hittills denna vecka.';
  }

  const topProject = getMostActiveProjectSince(weekStart);
  if (topProject) {
    return `${topProject.name} är ditt mest aktiva projekt just nu.`;
  }

  const generic = [
    'Små steg varje dag bygger stora resultat.',
    'Varje loggad timme ger dig tydligare bild av ditt liv.',
    'Konsekvent spårning gör det enklare att fatta bra beslut.',
  ];
  const index = new Date().getDate() % generic.length;
  return generic[index];
}

export function getHeroSummary() {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getWeekStart();
  const focusProjectId = getSetting('weekly_focus_project_id');
  const weeklyFocusProject = focusProjectId ? getProjectById(parseInt(focusProjectId, 10)) : null;
  const wellbeing = getDailyWellbeing(today);

  return {
    today_summary: {
      logged_hours: hoursFromMinutes(getTotalMinutesForDate(today)),
      taxi_hours: getTaxiHoursForDate(today),
      energy: wellbeing?.energy_level ?? null,
      calories: getDailyCalories(today),
    },
    week_summary: {
      worked_hours: hoursFromMinutes(getTotalMinutesSince(weekStart)),
      focus_project_name: weeklyFocusProject?.name ?? null,
      avg_sleep: getAverageSleepSince(weekStart),
      avg_energy: getAverageEnergySince(weekStart),
    },
  };
}
