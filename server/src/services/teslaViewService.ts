import { getDb } from '../db/connection.js';
import { getCalendarEventsForDate } from './calendarService.js';
import {
  getAverageMorningEnergySince,
  getAverageSleepScoreSince,
  getDailySleepCheckinByDate,
} from './dailySleepCheckinService.js';
import { getProjectByName } from './projectService.js';
import { getActiveTaxiTimerHours, getTaxiTimerStatus } from './taxiTimerService.js';
import {
  getMonthlyTaxiHours,
  getTaxiHoursForDate,
  getWeeklyTaxiHours,
} from './taxiService.js';
import { getTotalMinutesForDate } from './timeEntryService.js';
import { getAverageEnergySince } from './wellbeingService.js';
import type { CalendarEvent, TeslaViewData, TeslaViewEvent } from '../types/index.js';
import { daysAgoIso, getWeekStart, hoursFromMinutes, todayIso } from './utils.js';

const MORNING_ENERGY_EMOJI: Record<number, string> = {
  1: '😴',
  2: '😕',
  3: '🙂',
  4: '😊',
  5: '🚀',
};

function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, '0')} m`;
}

function toEventPreview(event: CalendarEvent): TeslaViewEvent {
  const start = new Date(event.start_time);
  const time = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
  return {
    id: event.id,
    title: event.title,
    time,
    start_time: event.start_time,
    end_time: event.end_time,
    project_name: event.project_name ?? null,
    notes: event.notes,
    color: event.color,
  };
}

function isTonightEvent(event: CalendarEvent): boolean {
  return new Date(event.start_time).getHours() >= 18;
}

function isUpcomingEvent(event: CalendarEvent, now: Date): boolean {
  return new Date(event.start_time).getTime() >= now.getTime() - 15 * 60 * 1000;
}

function getProjectHoursSince(dateIso: string): number {
  const taxiProject = getProjectByName('Taxi');
  let row: { mins: number };
  if (taxiProject) {
    row = getDb()
      .prepare(
        `SELECT COALESCE(SUM(duration_minutes), 0) as mins
         FROM time_entries
         WHERE end_time IS NOT NULL AND date(start_time) >= ?
           AND (project_id IS NULL OR project_id != ?)`
      )
      .get(dateIso, taxiProject.id) as { mins: number };
  } else {
    row = getDb()
      .prepare(
        `SELECT COALESCE(SUM(duration_minutes), 0) as mins
         FROM time_entries
         WHERE end_time IS NOT NULL AND date(start_time) >= ?`
      )
      .get(dateIso) as { mins: number };
  }
  return hoursFromMinutes(row.mins);
}

export function getTeslaView(): TeslaViewData {
  const today = todayIso();
  const now = new Date();
  const weekStart = getWeekStart();
  const monthStart = daysAgoIso(30);

  const sleepCheckin = getDailySleepCheckinByDate(today);
  const savedTaxiHours = getTaxiHoursForDate(today);
  const activeTaxiHours = getActiveTaxiTimerHours();
  const taxiHoursToday = Math.round((savedTaxiHours + activeTaxiHours) * 100) / 100;

  const tonightEvents = getCalendarEventsForDate(today)
    .filter(isTonightEvent)
    .map(toEventPreview);
  const remainingSchedule = getCalendarEventsForDate(today)
    .filter((event) => isUpcomingEvent(event, now))
    .map(toEventPreview);

  const weekEnergy =
    getAverageMorningEnergySince(weekStart) ?? getAverageEnergySince(weekStart);

  return {
    today,
    sleep: sleepCheckin
      ? {
          sleep_score: sleepCheckin.sleep_score,
          morning_energy: sleepCheckin.morning_energy,
          morning_energy_emoji: MORNING_ENERGY_EMOJI[sleepCheckin.morning_energy] ?? null,
          checkin: sleepCheckin,
        }
      : null,
    taxi_hours_today: taxiHoursToday,
    taxi_hours_today_display: formatHoursMinutes(taxiHoursToday),
    logged_hours_today: hoursFromMinutes(getTotalMinutesForDate(today)),
    tonight_focus: tonightEvents.map((event) => event.title),
    tonight_events: tonightEvents,
    remaining_schedule: remainingSchedule,
    taxi_timer: getTaxiTimerStatus(),
    life_snapshot: {
      week: {
        taxi_hours: getWeeklyTaxiHours(),
        project_hours: getProjectHoursSince(weekStart),
        avg_sleep_score: getAverageSleepScoreSince(weekStart),
        avg_energy: weekEnergy,
      },
      month: {
        taxi_hours: getMonthlyTaxiHours(),
        avg_sleep_score: getAverageSleepScoreSince(monthStart),
      },
    },
  };
}
