import { parseIsoDate, toIsoDate } from "../calculations/period";
import { TIME_ZONE } from "../settings/defaults";

const MONTH_NAMES_SV = [
  "januari",
  "februari",
  "mars",
  "april",
  "maj",
  "juni",
  "juli",
  "augusti",
  "september",
  "oktober",
  "november",
  "december",
];

export function todayIsoDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return parts;
}

export const WEEKDAY_SHORT_SV = ["Sön", "Mån", "Tis", "Ons", "Tor", "Fre", "Lör"] as const;

export function weekdayShortSv(date: string): string {
  const { year, month, day } = parseIsoDate(date);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return WEEKDAY_SHORT_SV[weekday];
}

export function formatDateLongSv(date: string): string {
  const { year, month, day } = parseIsoDate(date);
  return `${day} ${MONTH_NAMES_SV[month - 1]} ${year}`;
}

export function formatDateTitleSv(date: string): string {
  const { year, month, day } = parseIsoDate(date);
  const name = MONTH_NAMES_SV[month - 1];
  return `${day} ${name.slice(0, 1).toUpperCase()}${name.slice(1)} ${year}`;
}

export function formatDateHeadingSv(date: string): string {
  return formatDateLongSv(date).toUpperCase();
}

export function formatDateShortSv(date: string): string {
  const { month, day } = parseIsoDate(date);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
}

export function formatDateNumericSv(date: string): string {
  const { year, month, day } = parseIsoDate(date);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

const MONTH_SHORT_SV = [
  "jan.",
  "feb.",
  "mars",
  "apr.",
  "maj",
  "juni",
  "juli",
  "aug.",
  "sept.",
  "okt.",
  "nov.",
  "dec.",
];

export function formatMonthHeadingSv(year: number, month: number): string {
  return `${MONTH_NAMES_SV[month - 1].toUpperCase()} ${year}`;
}

export function formatWeekRangeSv(startDate: string, endDate: string): string {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);
  return `${start.day} ${MONTH_SHORT_SV[start.month - 1]} – ${end.day} ${MONTH_SHORT_SV[end.month - 1]}`;
}

export function nextYearMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

export { toIsoDate };
