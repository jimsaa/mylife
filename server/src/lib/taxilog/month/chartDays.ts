import {
  addDays,
  lastDayOfMonth,
  mondayOfWeek,
  monthPeriod,
  toIsoDate,
  yearMonthFromDate,
} from "../calculations/period";
import { weekdayShortSv } from "../dates/stockholm";
import { toDecimal } from "../calculations/money";

export type MonthChartDay = {
  date: string;
  day: number;
  weekdayShortSv: string;
  grossIncome: string;
};

export function buildMonthChartDays(
  year: number,
  month: number,
  days: Array<{ date: string; grossIncome: string }>,
): MonthChartDay[] {
  monthPeriod(year, month);
  const byDate = new Map(days.map((day) => [day.date, day.grossIncome]));
  const last = lastDayOfMonth(year, month);
  const chartDays: MonthChartDay[] = [];

  for (let day = 1; day <= last; day += 1) {
    const date = toIsoDate(year, month, day);
    chartDays.push({
      date,
      day,
      weekdayShortSv: weekdayShortSv(date),
      grossIncome: byDate.get(date) ?? "0",
    });
  }

  return chartDays;
}

export function maxGrossIncome(days: Array<{ grossIncome: string }>): number {
  return days.reduce((max, day) => {
    const value = Number(toDecimal(day.grossIncome).toString());
    return value > max ? value : max;
  }, 0);
}

export function barHeightPercent(grossIncome: string, maxIncome: number): number {
  if (maxIncome <= 0) {
    return 0;
  }
  const value = Number(toDecimal(grossIncome).toString());
  if (value <= 0) {
    return 0;
  }
  return Math.max(4, Math.round((value / maxIncome) * 100));
}

export function buildWeekChartDays(
  selectedDate: string,
  monthDays: MonthChartDay[],
): MonthChartDay[] {
  const monday = mondayOfWeek(selectedDate);
  const byDate = new Map(monthDays.map((day) => [day.date, day]));
  const week: MonthChartDay[] = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(monday, offset);
    const existing = byDate.get(date);
    if (existing) {
      week.push(existing);
      continue;
    }

    week.push({
      date,
      day: Number(date.slice(8, 10)),
      weekdayShortSv: weekdayShortSv(date),
      grossIncome: "0",
    });
  }

  return week;
}

export function resolveSelectedChartDate(input: {
  year: number;
  month: number;
  requestedDate?: string;
  today: string;
}): string | null {
  if (input.requestedDate) {
    try {
      const parsed = yearMonthFromDate(input.requestedDate);
      if (parsed.year === input.year && parsed.month === input.month) {
        return input.requestedDate;
      }
    } catch {
      // Ignore an invalid date query and fall back to today.
    }
  }

  try {
    const today = yearMonthFromDate(input.today);
    if (today.year === input.year && today.month === input.month) {
      return input.today;
    }
  } catch {
    return null;
  }

  return null;
}
