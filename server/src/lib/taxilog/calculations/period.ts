import { CalculationError } from "./errors";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type YearMonth = {
  year: number;
  month: number;
};

export function parseIsoDate(date: string): YearMonth & { day: number } {
  const match = DATE_PATTERN.exec(date.trim());
  if (!match) {
    throw new CalculationError("INVALID_DATE", "Ogiltigt datum. Använd formatet ÅÅÅÅ-MM-DD.");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new CalculationError("INVALID_DATE", "Ogiltigt datum. Använd formatet ÅÅÅÅ-MM-DD.");
  }

  return { year, month, day };
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function monthPeriod(year: number, month: number): {
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
} {
  if (month < 1 || month > 12) {
    throw new CalculationError("INVALID_MONTH", "Ogiltig månad.");
  }

  return {
    year,
    month,
    periodStart: toIsoDate(year, month, 1),
    periodEnd: toIsoDate(year, month, lastDayOfMonth(year, month)),
  };
}

export function yearMonthFromDate(date: string): YearMonth {
  const parsed = parseIsoDate(date);
  return { year: parsed.year, month: parsed.month };
}

export function previousYearMonth(year: number, month: number): YearMonth {
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

export function isSameYearMonth(left: YearMonth, right: YearMonth): boolean {
  return left.year === right.year && left.month === right.month;
}

export function compareYearMonth(left: YearMonth, right: YearMonth): number {
  if (left.year !== right.year) {
    return left.year - right.year;
  }
  return left.month - right.month;
}

export function isDateInPeriod(date: string, periodStart: string, periodEnd: string): boolean {
  return date >= periodStart && date <= periodEnd;
}

export function addDays(date: string, amount: number): string {
  const { year, month, day } = parseIsoDate(date);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return toIsoDate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** Monday of the ISO-style week containing the date. */
export function mondayOfWeek(date: string): string {
  const { year, month, day } = parseIsoDate(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  return addDays(date, offset);
}
