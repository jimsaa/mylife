import Decimal from "decimal.js";
import { normalizeTaxiLogState, sumKnown, type TaxiLogState, type TaxiWorkDayRecord } from "../service";
import { CalculationError } from "./errors";
import { isV3Categorized, perHour, sumDrivingGross, sumTotalIncome } from "./incomeSources";
import { toDecimal, toMoney } from "./money";
import { addDays, mondayOfWeek, monthPeriod, parseIsoDate, yearMonthFromDate } from "./period";

export type TaxiLogReportPeriod = {
  periodStart: string;
  periodEnd: string;
  drivingGross: string | null;
  totalIncome: string | null;
  ownBookings: string | null;
  handUp: string | null;
  uberIncome: string | null;
  boltIncome: string | null;
  bonus: string | null;
  tips: string | null;
  workedHours: string | null;
  incomePerHour: string | null;
};

export type TaxiLogReport = {
  reportDate: string;
  day: TaxiLogReportPeriod;
  week: TaxiLogReportPeriod;
  month: TaxiLogReportPeriod;
};

function moneyOrNull(value: string | null): string | null {
  if (value == null) return null;
  return toMoney(value).toFixed(2);
}

/** Unknown on any day stays unknown. Known zeroes still sum as zero. */
function sumReportField(values: Array<string | null | undefined>): string | null {
  if (values.some((value) => value == null)) return null;
  return moneyOrNull(sumKnown(values.map((value) => value ?? null)).value);
}

function drivingGross(
  ownBookings: string | null,
  handUp: string | null,
  uberIncome: string | null,
  boltIncome: string | null,
): string | null {
  if (ownBookings == null || handUp == null || uberIncome == null || boltIncome == null) return null;
  return sumDrivingGross({ ownBookings, handUp, uberIncome, boltIncome }).grossIncome.toFixed(2);
}

function totalIncome(driving: string | null, bonus: string | null, tips: string | null): string | null {
  if (driving == null || bonus == null || tips == null) return null;
  return sumTotalIncome(driving, bonus, tips).totalIncome.toFixed(2);
}

function sumHours(days: TaxiWorkDayRecord[]): string | null {
  if (days.length === 0) return null;
  return days.reduce((sum, day) => sum.plus(toDecimal(day.workHours)), new Decimal(0)).toString();
}

function daysInRange(days: TaxiWorkDayRecord[], start: string, end: string): TaxiWorkDayRecord[] {
  return days.filter((day) => day.date >= start && day.date <= end);
}

function summarize(days: TaxiWorkDayRecord[], periodStart: string, periodEnd: string): TaxiLogReportPeriod {
  const ownBookings = sumReportField(days.map((day) => day.ownBookings));
  const handUp = sumReportField(days.map((day) => day.handUp));
  const uberIncome = sumReportField(days.map((day) => day.uberIncome));
  const boltIncome = sumReportField(days.map((day) => day.boltIncome));
  const bonus = sumReportField(days.map((day) => day.bonus));
  const tips = sumReportField(days.map((day) => day.tips));
  const gross =
    days.length > 0 && days.every(isV3Categorized)
      ? drivingGross(ownBookings, handUp, uberIncome, boltIncome)
      : null;
  const workedHours = sumHours(days);
  return {
    periodStart,
    periodEnd,
    drivingGross: gross,
    totalIncome: totalIncome(gross, bonus, tips),
    ownBookings,
    handUp,
    uberIncome,
    boltIncome,
    bonus,
    tips,
    workedHours,
    incomePerHour: perHour(gross, workedHours ?? "0"),
  };
}

export function buildTaxiLogReport(state: TaxiLogState, reportDate: string): TaxiLogReport {
  parseIsoDate(reportDate);
  const normalized = normalizeTaxiLogState(state);
  const workDays = normalized.workDays;
  const recorded = workDays.find((day) => day.date === reportDate);
  if (!recorded) {
    throw new CalculationError("REPORT_DATE_MISSING", "Ingen registrerad arbetsdag för datumet.");
  }

  const weekStart = mondayOfWeek(reportDate);
  const weekEnd = addDays(weekStart, 6);
  const { year, month } = yearMonthFromDate(reportDate);
  const monthRange = monthPeriod(year, month);

  return {
    reportDate,
    day: summarize([recorded], reportDate, reportDate),
    week: summarize(daysInRange(workDays, weekStart, weekEnd), weekStart, weekEnd),
    month: summarize(
      daysInRange(workDays, monthRange.periodStart, monthRange.periodEnd),
      monthRange.periodStart,
      monthRange.periodEnd,
    ),
  };
}
