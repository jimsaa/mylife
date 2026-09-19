import Decimal from "decimal.js";
import {
  aggregateWorkDaysForPayroll,
  applySalaryPayment,
  buildMonthlyPayrollState,
  getSalaryStatusLabelSv,
  type SalaryPaymentRecord,
  type WorkDayPayrollSource,
} from "./calculations/payroll";
import { monthPeriod, parseIsoDate, yearMonthFromDate } from "./calculations/period";
import { todayIsoDate } from "./dates/stockholm";
import { formatDailyExport } from "./import/taxilogImport";
import { calculateDailyFinancials, parseChargingKwh, parseWorkedHours } from "./data/dailyFinancials";
import { DEFAULT_VAT_RATE } from "./settings/defaults";

export const HOME_CHARGING_LOCATION = "Hemma";

export type TaxiWorkDayRecord = {
  date: string;
  workHours: string;
  totalIncome: string;
  tips: string;
  vatRate: string;
  vatAmount: string;
  incomeExVat: string;
  totalCosts: string;
  totalKm: string;
  numberOfTrips: number;
};

export type TaxiChargingRecord = {
  date: string;
  kwh: string;
  location: string;
};

export type TaxiPayrollRecord = {
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  totalWorkDays: number;
  totalWorkHours: string;
  totalIncome: string;
  totalTips: string;
  vatRate: string | null;
  totalVat: string;
  totalIncomeExVat: string;
  totalCosts: string;
  accruedSalary: string;
  salaryStatus: string;
  paymentDate: string | null;
  paidAmount: string;
  remainingAmount: string;
};

export type TaxiPaymentRecord = {
  id: string;
  year: number;
  month: number;
  paymentDate: string;
  amount: string;
  notes: string | null;
};

export type TaxiLogState = {
  vatRate: string;
  workDays: TaxiWorkDayRecord[];
  charging: TaxiChargingRecord[];
  payrolls: TaxiPayrollRecord[];
  payments: TaxiPaymentRecord[];
};

export type DailyLogInput = {
  date: string;
  grossIncome: string;
  tips: string;
  workedHours: string;
  chargingKwh: string;
};

export function emptyTaxiLogState(): TaxiLogState {
  return {
    vatRate: DEFAULT_VAT_RATE,
    workDays: [],
    charging: [],
    payrolls: [],
    payments: [],
  };
}

function toSource(day: TaxiWorkDayRecord): WorkDayPayrollSource {
  return {
    date: day.date,
    workHours: day.workHours,
    totalKm: day.totalKm,
    numberOfTrips: day.numberOfTrips,
    totalIncome: day.totalIncome,
    tips: day.tips,
    vatRate: day.vatRate,
    vatAmount: day.vatAmount,
    incomeExVat: day.incomeExVat,
    totalCosts: day.totalCosts,
  };
}

export function syncPayrollInState(state: TaxiLogState, year: number, month: number, asOfDate: string): TaxiLogState {
  const period = monthPeriod(year, month);
  const sources = state.workDays
    .filter((day) => day.date >= period.periodStart && day.date <= period.periodEnd)
    .map(toSource);
  const payments: SalaryPaymentRecord[] = state.payments
    .filter((payment) => payment.year === year && payment.month === month)
    .map((payment) => ({
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      notes: payment.notes,
    }));

  const nextState = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(year, month, sources),
    payments,
    asOfDate,
  });

  const payroll: TaxiPayrollRecord = {
    year: nextState.year,
    month: nextState.month,
    periodStart: nextState.periodStart,
    periodEnd: nextState.periodEnd,
    totalWorkDays: nextState.totalWorkDays,
    totalWorkHours: nextState.totalWorkHours.toString(),
    totalIncome: nextState.totalIncome.toFixed(2),
    totalTips: nextState.totalTips.toFixed(2),
    vatRate: nextState.vatRate.toString(),
    totalVat: nextState.totalVat.toFixed(2),
    totalIncomeExVat: nextState.totalIncomeExVat.toFixed(2),
    totalCosts: nextState.totalCosts.toFixed(2),
    accruedSalary: nextState.accruedSalary.toFixed(2),
    salaryStatus: nextState.salaryStatus,
    paymentDate: nextState.paymentDate,
    paidAmount: nextState.totalPaid.toFixed(2),
    remainingAmount: nextState.remainingAmount.toFixed(2),
  };

  return {
    ...state,
    payrolls: [...state.payrolls.filter((row) => !(row.year === year && row.month === month)), payroll],
  };
}

export function saveDailyLogToState(state: TaxiLogState, input: DailyLogInput): TaxiLogState {
  parseIsoDate(input.date);
  const vatRate = state.vatRate || DEFAULT_VAT_RATE;
  const financials = calculateDailyFinancials({
    grossIncome: input.grossIncome,
    tips: input.tips,
    vatRate,
  });
  const workedHours = parseWorkedHours(input.workedHours);
  const kwh = parseChargingKwh(input.chargingKwh);

  const workDay: TaxiWorkDayRecord = {
    date: input.date,
    workHours: workedHours.toString(),
    totalIncome: financials.totalIncome.toFixed(2),
    tips: financials.tips.toFixed(2),
    vatRate: financials.vatRate.toString(),
    vatAmount: financials.vatAmount.toFixed(2),
    incomeExVat: financials.incomeExVat.toFixed(2),
    totalCosts: "0.00",
    totalKm: "0",
    numberOfTrips: 0,
  };

  const charging: TaxiChargingRecord = {
    date: input.date,
    kwh: kwh.toString(),
    location: HOME_CHARGING_LOCATION,
  };

  const next: TaxiLogState = {
    ...state,
    workDays: [...state.workDays.filter((day) => day.date !== input.date), workDay],
    charging: [
      ...state.charging.filter(
        (session) => !(session.date === input.date && session.location === HOME_CHARGING_LOCATION),
      ),
      charging,
    ],
  };

  const period = yearMonthFromDate(input.date);
  return syncPayrollInState(next, period.year, period.month, todayIsoDate());
}

export function loadDailyLogFromState(state: TaxiLogState, date: string) {
  const workDay = state.workDays.find((day) => day.date === date);
  const charging =
    state.charging.find((session) => session.date === date && session.location === HOME_CHARGING_LOCATION) ??
    state.charging.find((session) => session.date === date);

  if (!workDay && !charging) {
    return null;
  }

  return {
    date,
    grossIncome: workDay?.totalIncome ?? "0",
    netIncome: workDay?.incomeExVat ?? "0",
    vatAmount: workDay?.vatAmount ?? "0",
    vatRate: workDay?.vatRate ?? state.vatRate,
    tips: workDay?.tips ?? "0",
    workedHours: workDay?.workHours ?? "0",
    chargingKwh: charging?.kwh ?? "0",
  };
}

export function loadMonthOverviewFromState(state: TaxiLogState, year: number, month: number) {
  const period = monthPeriod(year, month);
  const workDays = state.workDays.filter(
    (day) => day.date >= period.periodStart && day.date <= period.periodEnd,
  );
  const chargingSessions = state.charging.filter(
    (session) => session.date >= period.periodStart && session.date <= period.periodEnd,
  );

  const chargingByDate = new Map<string, string>();
  for (const session of chargingSessions) {
    const current = chargingByDate.get(session.date);
    if (!current || session.location === HOME_CHARGING_LOCATION) {
      chargingByDate.set(session.date, session.kwh);
    }
  }

  const payments = state.payments
    .filter((payment) => payment.year === year && payment.month === month)
    .map((payment) => ({
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      notes: payment.notes,
    }));

  const payroll = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(year, month, workDays.map(toSource)),
    payments,
    asOfDate: todayIsoDate(),
  });

  const chargingKwh = [...chargingByDate.values()].reduce(
    (sum, value) => sum.plus(value),
    new Decimal(0),
  );

  return {
    year,
    month,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    grossIncome: payroll.totalIncome.toString(),
    vatAmount: payroll.totalVat.toString(),
    netIncome: payroll.totalIncomeExVat.toString(),
    tips: payroll.totalTips.toString(),
    workedHours: payroll.totalWorkHours.toString(),
    chargingKwh: chargingKwh.toString(),
    accruedSalary: payroll.accruedSalary.toString(),
    salaryPaid: payroll.totalPaid.toString(),
    salaryRemaining: payroll.remainingAmount.toString(),
    salaryStatus: payroll.salaryStatus,
    salaryStatusLabel: getSalaryStatusLabelSv(payroll.salaryStatus),
    days: workDays.map((day) => ({
      date: day.date,
      grossIncome: day.totalIncome,
      netIncome: day.incomeExVat,
      tips: day.tips,
      workedHours: day.workHours,
      chargingKwh: chargingByDate.get(day.date) ?? "0",
    })),
  };
}

export function buildDailyExportFromState(state: TaxiLogState, date: string): string | null {
  const log = loadDailyLogFromState(state, date);
  if (!log) {
    return null;
  }
  return formatDailyExport({
    date: log.date,
    grossIncome: log.grossIncome,
    tips: log.tips,
    workedHours: log.workedHours,
    chargingKwh: log.chargingKwh,
  });
}

export function recordSalaryPaymentInState(
  state: TaxiLogState,
  year: number,
  month: number,
  payment: { paymentDate: string; amount: string; notes?: string | null },
): TaxiLogState {
  const current = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(
      year,
      month,
      state.workDays
        .filter((day) => {
          const period = monthPeriod(year, month);
          return day.date >= period.periodStart && day.date <= period.periodEnd;
        })
        .map(toSource),
    ),
    payments: state.payments
      .filter((row) => row.year === year && row.month === month)
      .map((row) => ({
        paymentDate: row.paymentDate,
        amount: row.amount,
        notes: row.notes,
      })),
    asOfDate: todayIsoDate(),
  });

  applySalaryPayment(
    current,
    {
      paymentDate: payment.paymentDate,
      amount: payment.amount,
      notes: payment.notes,
    },
    todayIsoDate(),
  );

  const next: TaxiLogState = {
    ...state,
    payments: [
      ...state.payments,
      {
        id: `pay_${year}_${month}_${Date.now()}`,
        year,
        month,
        paymentDate: payment.paymentDate,
        amount: payment.amount,
        notes: payment.notes ?? null,
      },
    ],
  };

  return syncPayrollInState(next, year, month, todayIsoDate());
}

export const TAXILOG_SEED_DAYS: DailyLogInput[] = [
  {
    date: "2026-09-18",
    grossIncome: "2235",
    tips: "0",
    workedHours: "8",
    chargingKwh: "0",
  },
  {
    date: "2026-09-19",
    grossIncome: "1214",
    tips: "0",
    workedHours: "9",
    chargingKwh: "16.3",
  },
];

export function seedRealTaxiLogData(state: TaxiLogState): TaxiLogState {
  if (state.workDays.length > 0) {
    return state;
  }
  return TAXILOG_SEED_DAYS.reduce((current, day) => saveDailyLogToState(current, day), state);
}
