import type { DashboardData } from '../types/index.js';
import { getPlannedMinutesForDate } from './calendarService.js';
import { getDailyFocus } from './dailyFocusService.js';
import { getDailyCalories, getCalorieTarget } from './foodService.js';
import { generateMotivationalInsight, getHeroSummary } from './heroInsightService.js';
import { getProjectById } from './projectService.js';
import { getProfileSettings, getSwedishGreeting } from './profileService.js';
import { getSetting } from './settingsService.js';
import { getTimeEntries, getTotalMinutesForDate, getTotalMinutesSince } from './timeEntryService.js';
import { getDailySleepCheckinByDate } from './dailySleepCheckinService.js';
import { getDailyWellbeing } from './wellbeingService.js';
import { getWeekNumber, getWeekStart, hoursFromMinutes, todayIso } from './utils.js';

function readinessEmoji(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 75) return '🟢';
  if (score >= 55) return '🟡';
  if (score >= 35) return '🟠';
  return '🔴';
}

function getWorkloadIndicator(hours: number): 'green' | 'yellow' | 'red' {
  if (hours < 5) return 'green';
  if (hours < 7) return 'yellow';
  return 'red';
}

export function getDashboard(): DashboardData {
  const today = todayIso();
  const weekStart = getWeekStart();

  const plannedMins = getPlannedMinutesForDate(today);
  const actualMins = getTotalMinutesForDate(today);
  const weeklyMins = getTotalMinutesSince(weekStart);

  const focusProjectId = getSetting('weekly_focus_project_id');
  const weeklyFocusProject = focusProjectId ? getProjectById(parseInt(focusProjectId, 10)) : null;

  const wellbeing = getDailyWellbeing(today);
  const sleepCheckin = getDailySleepCheckinByDate(today);
  const dailyFocus = getDailyFocus(today);
  const latestActivities = getTimeEntries(5);

  const actualHours = hoursFromMinutes(actualMins);
  const profile = getProfileSettings();
  const heroSummary = getHeroSummary();

  return {
    today,
    week_number: getWeekNumber(),
    planned_hours_today: hoursFromMinutes(plannedMins),
    actual_hours_today: actualHours,
    weekly_total_hours: hoursFromMinutes(weeklyMins),
    weekly_focus_project: weeklyFocusProject,
    latest_activities: latestActivities,
    daily_energy: wellbeing?.energy_level ?? null,
    daily_calories: getDailyCalories(today),
    calorie_target: getCalorieTarget(),
    workload_indicator: getWorkloadIndicator(actualHours),
    daily_focus: dailyFocus,
    morning_sleep: sleepCheckin
      ? {
          sleep_score: sleepCheckin.sleep_score,
          actual_sleep_minutes: sleepCheckin.actual_sleep_minutes,
          deep_sleep_minutes: sleepCheckin.deep_sleep_minutes,
          rem_sleep_minutes: sleepCheckin.rem_sleep_minutes,
          morning_energy: sleepCheckin.morning_energy,
          morning_readiness_score: sleepCheckin.morning_readiness_score,
          morning_readiness_label: sleepCheckin.morning_readiness_label,
          morning_readiness_emoji: readinessEmoji(sleepCheckin.morning_readiness_score),
        }
      : null,
    hero: {
      display_name: profile.display_name,
      greeting: getSwedishGreeting(profile.display_name),
      insight: generateMotivationalInsight(),
      ...heroSummary,
    },
  };
}
