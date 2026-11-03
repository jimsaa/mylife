import Decimal from "decimal.js";
import {
  aggregateWorkDaysForPayroll,
  applySalaryPayment,
  buildMonthlyPayrollState,
  calculateAccruedSalary,
  getSalaryStatusLabelSv,
  type SalaryPaymentRecord,
  type WorkDayPayrollSource,
} from "./calculations/payroll";
import { monthPeriod, parseIsoDate, yearMonthFromDate } from "./calculations/period";
import { CalculationError } from "./calculations/errors";
import { toMoney } from "./calculations/money";
import {
  bonusSourceKey,
  migrateHistoricalTips,
  privateNetPaymentNotes,
  projectSalarySplit,
  summarizeSavings,
  surplusSourceKey,
  tipsSourceKey,
  upsertSavingsEntry,
  type SavingsLedgerEntry,
} from "./calculations/savings";
import { todayIsoDate } from "./dates/stockholm";
import { formatDailyExport, type TaxiLogDailyImport } from "./import/taxilogImport";
import { calculateDailyFinancials, parseChargingKwh, parseWorkedHours } from "./data/dailyFinancials";
import { DEFAULT_PRIVATE_NET_WITHDRAWAL, DEFAULT_VAT_RATE } from "./settings/defaults";

export const HOME_CHARGING_LOCATION = "Hemma";

export type TaxiWorkDayRecord = {
  date: string;
  workHours: string;
  totalIncome: string;
  ownBookings: string | null;
  otherIncome: string | null;
  tips: string;
  bonus: string | null;
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
  settlementLocked: boolean;
  settlementLockedAt: string | null;
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
  privateNetTarget: string;
  workDays: TaxiWorkDayRecord[];
  charging: TaxiChargingRecord[];
  payrolls: TaxiPayrollRecord[];
  payments: TaxiPaymentRecord[];
  savingsLedger: SavingsLedgerEntry[];
};

export type DailyLogInput = {
  date: string;
  grossIncome: string;
  tips: string;
  workedHours: string;
  chargingKwh: string;
  ownBookings?: string | null;
  otherIncome?: string | null;
  bonus?: string | null;
};

export function emptyTaxiLogState(): TaxiLogState {
  return {
    vatRate: DEFAULT_VAT_RATE,
    privateNetTarget: DEFAULT_PRIVATE_NET_WITHDRAWAL,
    workDays: [],
    charging: [],
    payrolls: [],
    payments: [],
    savingsLedger: [],
  };
}

export function normalizeTaxiLogState(raw: TaxiLogState): TaxiLogState {
  const workDays = (raw.workDays ?? []).map((day) => ({
    ...day,
    ownBookings: day.ownBookings ?? null,
    otherIncome: day.otherIncome ?? null,
    bonus: day.bonus ?? null,
  }));
  const payrolls = (raw.payrolls ?? []).map((payroll) => ({
    ...payroll,
    settlementLocked: Boolean(payroll.settlementLocked),
    settlementLockedAt: payroll.settlementLockedAt ?? null,
  }));
  const savingsLedger = migrateHistoricalTips(raw.savingsLedger ?? [], workDays);

  return {
    vatRate: raw.vatRate || DEFAULT_VAT_RATE,
    privateNetTarget: raw.privateNetTarget || DEFAULT_PRIVATE_NET_WITHDRAWAL,
    workDays,
    charging: raw.charging ?? [],
    payrolls,
    payments: raw.payments ?? [],
    savingsLedger,
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

function isMonthLocked(state: TaxiLogState, year: number, month: number): boolean {
  return Boolean(state.payrolls.find((row) => row.year === year && row.month === month)?.settlementLocked);
}

function assertMonthUnlocked(state: TaxiLogState, year: number, month: number) {
  if (isMonthLocked(state, year, month)) {
    throw new CalculationError(
      "MONTH_LOCKED",
      "Månaden är låst. Lås upp med en uttrycklig korrigering innan du ändrar.",
    );
  }
}

function sumKnown(values: Array<string | null>): { value: string | null; known: boolean } {
  const known = values.filter((value): value is string => value !== null && value !== undefined);
  if (known.length === 0) {
    return { value: null, known: false };
  }
  return {
    value: known.reduce((sum, value) => sum.plus(value), new Decimal(0)).toString(),
    known: true,
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

  const existing = state.payrolls.find((row) => row.year === year && row.month === month);
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
    settlementLocked: existing?.settlementLocked ?? false,
    settlementLockedAt: existing?.settlementLockedAt ?? null,
  };

  return {
    ...state,
    payrolls: [...state.payrolls.filter((row) => !(row.year === year && row.month === month)), payroll],
  };
}

function applyDaySavings(state: TaxiLogState, date: string, tips: string, bonus: string | null): TaxiLogState {
  let ledger = upsertSavingsEntry(state.savingsLedger, {
    occurredAt: date,
    kind: "TIPS",
    amount: tips,
    sourceKey: tipsSourceKey(date),
    description: `Dricks ${date}`,
  });
  if (bonus !== null) {
    ledger = upsertSavingsEntry(ledger, {
      occurredAt: date,
      kind: "BONUS",
      amount: bonus,
      sourceKey: bonusSourceKey(date),
      description: `Bonus ${date}`,
    });
  }
  return { ...state, savingsLedger: ledger };
}

export function saveDailyLogToState(state: TaxiLogState, input: DailyLogInput): TaxiLogState {
  parseIsoDate(input.date);
  const normalized = normalizeTaxiLogState(state);
  const period = yearMonthFromDate(input.date);
  assertMonthUnlocked(normalized, period.year, period.month);

  const vatRate = normalized.vatRate || DEFAULT_VAT_RATE;
  const financials = calculateDailyFinancials({
    grossIncome: input.grossIncome,
    tips: input.tips,
    bonus: input.bonus ?? "0",
    vatRate,
  });
  const workedHours = parseWorkedHours(input.workedHours);
  const kwh = parseChargingKwh(input.chargingKwh);
  const bonus = input.bonus === undefined ? null : financials.bonus.toFixed(2);
  const ownBookings = input.ownBookings === undefined ? null : input.ownBookings;
  const otherIncome = input.otherIncome === undefined ? null : input.otherIncome;

  const workDay: TaxiWorkDayRecord = {
    date: input.date,
    workHours: workedHours.toString(),
    totalIncome: financials.totalIncome.toFixed(2),
    ownBookings,
    otherIncome,
    tips: financials.tips.toFixed(2),
    bonus,
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

  const next: TaxiLogState = applyDaySavings(
    {
      ...normalized,
      workDays: [...normalized.workDays.filter((day) => day.date !== input.date), workDay],
      charging: [
        ...normalized.charging.filter(
          (session) => !(session.date === input.date && session.location === HOME_CHARGING_LOCATION),
        ),
        charging,
      ],
    },
    input.date,
    financials.tips.toFixed(2),
    bonus,
  );

  return syncPayrollInState(next, period.year, period.month, todayIsoDate());
}

export function loadDailyLogFromState(state: TaxiLogState, date: string) {
  const normalized = normalizeTaxiLogState(state);
  const workDay = normalized.workDays.find((day) => day.date === date);
  const charging =
    normalized.charging.find((session) => session.date === date && session.location === HOME_CHARGING_LOCATION) ??
    normalized.charging.find((session) => session.date === date);

  if (!workDay && !charging) {
    return null;
  }

  return {
    date,
    grossIncome: workDay?.totalIncome ?? "0",
    ownBookings: workDay?.ownBookings ?? null,
    otherIncome: workDay?.otherIncome ?? null,
    netIncome: workDay?.incomeExVat ?? "0",
    vatAmount: workDay?.vatAmount ?? "0",
    vatRate: workDay?.vatRate ?? normalized.vatRate,
    tips: workDay?.tips ?? "0",
    bonus: workDay?.bonus ?? null,
    workedHours: workDay?.workHours ?? "0",
    chargingKwh: charging?.kwh ?? "0",
  };
}

export function loadMonthOverviewFromState(state: TaxiLogState, year: number, month: number) {
  const normalized = normalizeTaxiLogState(state);
  const period = monthPeriod(year, month);
  const workDays = normalized.workDays.filter(
    (day) => day.date >= period.periodStart && day.date <= period.periodEnd,
  );
  const chargingSessions = normalized.charging.filter(
    (session) => session.date >= period.periodStart && session.date <= period.periodEnd,
  );

  const chargingByDate = new Map<string, string>();
  for (const session of chargingSessions) {
    const current = chargingByDate.get(session.date);
    if (!current || session.location === HOME_CHARGING_LOCATION) {
      chargingByDate.set(session.date, session.kwh);
    }
  }

  const payments = normalized.payments
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
  const own = sumKnown(workDays.map((day) => day.ownBookings));
  const other = sumKnown(workDays.map((day) => day.otherIncome));
  const bonus = sumKnown(workDays.map((day) => day.bonus));
  const split = projectSalarySplit(payroll.accruedSalary, normalized.privateNetTarget);
  const existing = normalized.payrolls.find((row) => row.year === year && row.month === month);
  const savings = summarizeSavings(normalized.savingsLedger, year, month);
  const privateNetTaken = normalized.payments
    .filter((payment) => payment.year === year && payment.month === month && payment.notes === privateNetPaymentNotes(year, month))
    .reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));

  return {
    year,
    month,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    grossIncome: payroll.totalIncome.toString(),
    ownBookings: own.value,
    otherIncome: other.value,
    vatAmount: payroll.totalVat.toString(),
    netIncome: payroll.totalIncomeExVat.toString(),
    tips: payroll.totalTips.toString(),
    bonus: bonus.value,
    workedHours: payroll.totalWorkHours.toString(),
    chargingKwh: chargingKwh.toString(),
    accruedSalary: payroll.accruedSalary.toString(),
    salaryPaid: payroll.totalPaid.toString(),
    salaryRemaining: payroll.remainingAmount.toString(),
    salaryStatus: payroll.salaryStatus,
    salaryStatusLabel: getSalaryStatusLabelSv(payroll.salaryStatus),
    privateNetTarget: split.privateNetTarget.toFixed(2),
    projectedPrivateNet: split.projectedPrivateNet.toFixed(2),
    projectedSurplus: split.projectedSurplus.toFixed(2),
    projectedShortfall: split.projectedShortfall.toFixed(2),
    privateNetTaken: toMoney(privateNetTaken).toFixed(2),
    settlementLocked: existing?.settlementLocked ?? false,
    settlementLockedAt: existing?.settlementLockedAt ?? null,
    savings,
    days: workDays.map((day) => ({
      date: day.date,
      grossIncome: day.totalIncome,
      ownBookings: day.ownBookings,
      otherIncome: day.otherIncome,
      netIncome: day.incomeExVat,
      tips: day.tips,
      bonus: day.bonus,
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
  const exportInput: TaxiLogDailyImport = {
    version: log.ownBookings !== null || log.bonus ? "2" : "1",
    date: log.date,
    grossIncome: log.grossIncome,
    ownBookings: log.ownBookings,
    otherIncome: log.otherIncome,
    tips: log.tips,
    bonus: log.bonus ?? "0",
    workedHours: log.workedHours,
    chargingKwh: log.chargingKwh,
  };
  return formatDailyExport(exportInput);
}

export function recordSalaryPaymentInState(
  state: TaxiLogState,
  year: number,
  month: number,
  payment: { paymentDate: string; amount: string; notes?: string | null },
): TaxiLogState {
  const normalized = normalizeTaxiLogState(state);
  assertMonthUnlocked(normalized, year, month);
  const current = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(
      year,
      month,
      normalized.workDays
        .filter((day) => {
          const period = monthPeriod(year, month);
          return day.date >= period.periodStart && day.date <= period.periodEnd;
        })
        .map(toSource),
    ),
    payments: normalized.payments
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
    ...normalized,
    payments: [
      ...normalized.payments,
      {
        id: `pay_${year}_${month}_${payment.notes ?? payment.paymentDate}_${payment.amount}`,
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

export function settleMonthInState(state: TaxiLogState, year: number, month: number, asOfDate = todayIsoDate()) {
  const normalized = normalizeTaxiLogState(state);
  assertMonthUnlocked(normalized, year, month);
  const overview = loadMonthOverviewFromState(normalized, year, month);
  let next = normalized;

  const notes = privateNetPaymentNotes(year, month);
  const alreadyPaid = next.payments.some((payment) => payment.year === year && payment.month === month && payment.notes === notes);
  if (!alreadyPaid && toMoney(overview.projectedPrivateNet).greaterThan(0)) {
    next = recordSalaryPaymentInState(next, year, month, {
      paymentDate: asOfDate,
      amount: overview.projectedPrivateNet,
      notes,
    });
  }

  next = {
    ...next,
    savingsLedger: upsertSavingsEntry(next.savingsLedger, {
      occurredAt: asOfDate,
      kind: "SALARY_SURPLUS",
      amount: overview.projectedSurplus,
      sourceKey: surplusSourceKey(year, month),
      description: `Löneöverskott ${year}-${month}`,
    }),
  };

  next = syncPayrollInState(next, year, month, asOfDate);
  return {
    ...next,
    payrolls: next.payrolls.map((payroll) =>
      payroll.year === year && payroll.month === month
        ? { ...payroll, settlementLocked: true, settlementLockedAt: asOfDate }
        : payroll,
    ),
  };
}

export function unlockMonthInState(state: TaxiLogState, year: number, month: number) {
  const normalized = normalizeTaxiLogState(state);
  return {
    ...normalized,
    payrolls: normalized.payrolls.map((payroll) =>
      payroll.year === year && payroll.month === month
        ? { ...payroll, settlementLocked: false, settlementLockedAt: null }
        : payroll,
    ),
  };
}

export function recordManualSavingsInState(
  state: TaxiLogState,
  input: { date: string; amount: string; kind: "MANUAL_DEPOSIT" | "MANUAL_WITHDRAWAL"; description: string },
) {
  const normalized = normalizeTaxiLogState(state);
  parseIsoDate(input.date);
  return {
    ...normalized,
    savingsLedger: upsertSavingsEntry(normalized.savingsLedger, {
      occurredAt: input.date,
      kind: input.kind,
      amount: input.amount,
      sourceKey: `manual:${input.kind}:${input.date}:${input.amount}:${input.description}`,
      description: input.description,
    }),
  };
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
  const normalized = normalizeTaxiLogState(state);
  if (normalized.workDays.length > 0) {
    return normalized;
  }
  return TAXILOG_SEED_DAYS.reduce((current, day) => saveDailyLogToState(current, day), normalized);
}

export function previewImport(state: TaxiLogState, parsed: TaxiLogDailyImport) {
  const financials = calculateDailyFinancials({
    grossIncome: parsed.grossIncome,
    tips: parsed.tips,
    bonus: parsed.bonus,
    vatRate: state.vatRate || DEFAULT_VAT_RATE,
  });
  return {
    parsed,
    preview: {
      grossIncome: financials.totalIncome.toString(),
      ownBookings: parsed.ownBookings,
      otherIncome: parsed.otherIncome,
      vatAmount: financials.vatAmount.toFixed(2),
      netIncome: financials.incomeExVat.toFixed(2),
      tips: financials.tips.toFixed(2),
      bonus: financials.bonus.toFixed(2),
      estimatedSalary: calculateAccruedSalary(financials.incomeExVat).toFixed(2),
      savingsFromDay: financials.tips.plus(financials.bonus).toFixed(2),
    },
  };
}
