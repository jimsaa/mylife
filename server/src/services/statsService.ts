import { getDb } from '../db/connection.js';
import type { StatsSummary, StatsTrends } from '../types/index.js';
import { getAverageCaloriesSince, getCalorieTrendSince } from './foodService.js';
import { getProjectByName } from './projectService.js';
import { getSetting } from './settingsService.js';
import { getAverageSleepSince, getSleepTrendSince } from './sleepService.js';
import { getTaxiHoursSince, getTaxiTrendSince } from './taxiService.js';
import { getTotalMinutesSince } from './timeEntryService.js';
import { getAverageEnergySince, getAverageMoodSince } from './wellbeingService.js';
import { daysAgoIso, hoursFromMinutes } from './utils.js';

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

function getTimeByProjectSince(dateIso: string): StatsSummary['time_by_project'] {
  const rows = getDb()
    .prepare(
      `SELECT p.id as project_id, p.name as project_name, p.color,
              COALESCE(SUM(te.duration_minutes), 0) as mins
       FROM projects p
       LEFT JOIN time_entries te ON te.project_id = p.id
         AND te.end_time IS NOT NULL AND date(te.start_time) >= ?
       GROUP BY p.id
       HAVING mins > 0
       ORDER BY mins DESC`
    )
    .all(dateIso) as { project_id: number; project_name: string; color: string; mins: number }[];

  return rows.map((r) => ({
    project_id: r.project_id,
    project_name: r.project_name,
    color: r.color,
    hours: hoursFromMinutes(r.mins),
  }));
}

function getFocusedWorkTrend(dateIso: string, projectIds: number[]): StatsTrends['focused_work_trend'] {
  if (!projectIds.length) return [];

  const placeholders = projectIds.map(() => '?').join(',');
  return getDb()
    .prepare(
      `SELECT date(start_time) as date, COALESCE(SUM(duration_minutes), 0) / 60.0 as value
       FROM time_entries
       WHERE end_time IS NOT NULL AND date(start_time) >= ?
         AND project_id IN (${placeholders})
       GROUP BY date(start_time) ORDER BY date ASC`
    )
    .all(dateIso, ...projectIds) as { date: string; value: number }[];
}

function getWellbeingTrend(dateIso: string, field: 'energy_level' | 'mood_level'): StatsTrends['energy_trend'] {
  return getDb()
    .prepare(
      `SELECT date, ${field} as value FROM daily_wellbeing
       WHERE date >= ? AND ${field} IS NOT NULL ORDER BY date ASC`
    )
    .all(dateIso) as { date: string; value: number }[];
}

export function getStatsSummary(days: number): StatsSummary {
  const since = daysAgoIso(days);
  const focusedIds = getFocusedProjectIds();
  const taxiProject = getProjectByName('Taxi');

  const taxiHoursFromShifts = getTaxiHoursSince(since);
  const taxiHoursFromTime = taxiProject
    ? hoursFromMinutes(getTotalMinutesSince(since, [taxiProject.id]))
    : 0;

  return {
    period_days: days,
    time_by_project: getTimeByProjectSince(since),
    taxi_hours: Math.max(taxiHoursFromShifts, taxiHoursFromTime),
    focused_work_hours: hoursFromMinutes(getTotalMinutesSince(since, focusedIds)),
    avg_energy: getAverageEnergySince(since),
    avg_calories: getAverageCaloriesSince(since),
    avg_sleep: getAverageSleepSince(since),
    avg_mood: getAverageMoodSince(since),
  };
}

export function getStatsTrends(days: number): StatsTrends {
  const since = daysAgoIso(days);
  const focusedIds = getFocusedProjectIds();
  const timeAllocation = getTimeByProjectSince(since);

  return {
    period_days: days,
    time_allocation: timeAllocation,
    most_active_projects: timeAllocation.slice(0, 5),
    taxi_trend: getTaxiTrendSince(since),
    focused_work_trend: getFocusedWorkTrend(since, focusedIds),
    energy_trend: getWellbeingTrend(since, 'energy_level'),
    mood_trend: getWellbeingTrend(since, 'mood_level'),
    sleep_trend: getSleepTrendSince(since),
    calorie_trend: getCalorieTrendSince(since),
  };
}

// Future AI insights hook — returns structured data for LLM analysis
export function getInsightsContext(): Record<string, unknown> {
  return {
    summary_7d: getStatsSummary(7),
    summary_30d: getStatsSummary(30),
    trends_30d: getStatsTrends(30),
    generated_at: new Date().toISOString(),
  };
}
