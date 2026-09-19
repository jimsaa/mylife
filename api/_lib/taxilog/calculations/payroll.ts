import Decimal from "decimal.js";
import { CalculationError } from "./errors";
import { assertNonNegative, toDecimal, toMoney, type DecimalInput } from "./money";
import {
  compareYearMonth,
  isSameYearMonth,
  monthPeriod,
  parseIsoDate,
  yearMonthFromDate,
  type YearMonth,
} from "./period";
import type { SalaryStatus } from "../settings/defaults";
import { DEFAULT_SALARY_RATE, DEFAULT_VAT_RATE } from "../settings/defaults";

export type WorkDayPayrollSource = {
  date: string;
  workHours?: DecimalInput | null;
  totalKm?: DecimalInput | null;
  numberOfTrips?: DecimalInput | null;
  totalIncome: DecimalInput;
  tips: DecimalInput;
  vatRate?: DecimalInput | null;
  vatAmount: DecimalInput;
  incomeExVat: DecimalInput;
  totalCosts: DecimalInput;
};

export type SalaryPaymentRecord = {
  paymentDate: string;
  amount: DecimalInput;
  notes?: string | null;
};

export type MonthlyPayrollTotals = {
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  totalWorkDays: number;
  totalWorkHours: Decimal;
  totalKm: Decimal;
  totalTrips: number;
  totalIncome: Decimal;
  totalTips: Decimal;
  vatRate: Decimal;
  totalVat: Decimal;
  totalIncomeExVat: Decimal;
  totalCosts: Decimal;
  accruedSalary: Decimal;
};

export type MonthlyPayrollState = MonthlyPayrollTotals & {
  payments: SalaryPaymentRecord[];
  totalPaid: Decimal;
  remainingAmount: Decimal;
  salaryStatus: SalaryStatus;
  paymentDate: string | null;
};

export const SALARY_STATUS_LABEL_SV: Record<SalaryStatus, string> = {
  ACCRUING: "PÅGÅR",
  READY: "KLAR FÖR UTBETALNING",
  PARTIALLY_PAID: "DELVIS UTBETALD",
  PAID: "UTBETALD",
};

/**
 * Monthly accrued salary is isolated here so the model can change later.
 *
 * Current model:
 *   salary = incomeExVat × salaryRate
 *   incomeExVat = grossIncome − VAT
 *   VAT = grossIncome × 6%
 *
 * Equivalent:
 *   salary = grossIncome × (1 − 0.06) × 0.47
 *
 * Tips and daily costs are never included. Salary is not a daily expense.
 */
export function calculateAccruedSalary(
  incomeExVat: DecimalInput,
  salaryRatePercent: DecimalInput = DEFAULT_SALARY_RATE,
): Decimal {
  const netIncome = assertNonNegative(incomeExVat, "Inkomst efter moms kan inte vara negativ.");
  const rate = assertNonNegative(salaryRatePercent, "Lönesatsen kan inte vara negativ.");
  return toMoney(netIncome.times(rate).dividedBy(100));
}

export function calculateTotalPaid(payments: SalaryPaymentRecord[]): Decimal {
  return toMoney(
    payments.reduce((sum, payment) => sum.plus(assertNonNegative(payment.amount, "Utbetalt belopp kan inte vara negativt.")), new Decimal(0)),
  );
}

export function calculateRemainingSalary(
  accruedSalary: DecimalInput,
  totalPaid: DecimalInput,
): Decimal {
  const accrued = toMoney(accruedSalary);
  const paid = assertNonNegative(totalPaid, "Utbetalt belopp kan inte vara negativt.");
  return toMoney(accrued.minus(paid));
}

export function latestPaymentDate(payments: SalaryPaymentRecord[]): string | null {
  if (payments.length === 0) {
    return null;
  }

  return payments
    .map((payment) => {
      parseIsoDate(payment.paymentDate);
      return payment.paymentDate;
    })
    .sort()
    .at(-1) ?? null;
}

export function resolveSalaryStatus(input: {
  year: number;
  month: number;
  accruedSalary: DecimalInput;
  remainingAmount: DecimalInput;
  totalPaid: DecimalInput;
  asOfDate: string;
}): SalaryStatus {
  const remaining = toDecimal(input.remainingAmount);
  const accrued = toDecimal(input.accruedSalary);
  const paid = toDecimal(input.totalPaid);
  const asOf = yearMonthFromDate(input.asOfDate);
  const period = { year: input.year, month: input.month };

  if (remaining.isZero() && (accrued.greaterThan(0) || paid.greaterThan(0))) {
    return "PAID";
  }

  if (isSameYearMonth(period, asOf) || compareYearMonth(period, asOf) > 0) {
    return "ACCRUING";
  }

  if (paid.greaterThan(0) && remaining.greaterThan(0)) {
    return "PARTIALLY_PAID";
  }

  return "READY";
}

export function aggregateWorkDaysForPayroll(
  year: number,
  month: number,
  workDays: WorkDayPayrollSource[],
): MonthlyPayrollTotals {
  const period = monthPeriod(year, month);
  const inPeriod = workDays.filter((day) => day.date >= period.periodStart && day.date <= period.periodEnd);

  const totals = inPeriod.reduce(
    (acc, day) => {
      acc.totalWorkHours = acc.totalWorkHours.plus(toDecimal(day.workHours ?? 0));
      acc.totalKm = acc.totalKm.plus(toDecimal(day.totalKm ?? 0));
      acc.totalTrips += Number(day.numberOfTrips ?? 0);
      acc.totalIncome = acc.totalIncome.plus(toDecimal(day.totalIncome));
      acc.totalTips = acc.totalTips.plus(toDecimal(day.tips));
      acc.totalVat = acc.totalVat.plus(toDecimal(day.vatAmount));
      acc.totalIncomeExVat = acc.totalIncomeExVat.plus(toDecimal(day.incomeExVat));
      acc.totalCosts = acc.totalCosts.plus(toDecimal(day.totalCosts));
      if (day.vatRate !== null && day.vatRate !== undefined && day.vatRate !== "") {
        acc.vatRates.push(toDecimal(day.vatRate));
      }
      return acc;
    },
    {
      totalWorkHours: new Decimal(0),
      totalKm: new Decimal(0),
      totalTrips: 0,
      totalIncome: new Decimal(0),
      totalTips: new Decimal(0),
      totalVat: new Decimal(0),
      totalIncomeExVat: new Decimal(0),
      totalCosts: new Decimal(0),
      vatRates: [] as Decimal[],
    },
  );

  const vatRate = totals.vatRates[0] ?? toDecimal(DEFAULT_VAT_RATE);
  const totalIncome = toMoney(totals.totalIncome);
  const totalVat = toMoney(totals.totalVat);
  const totalCosts = toMoney(totals.totalCosts);

  return {
    ...period,
    totalWorkDays: inPeriod.length,
    totalWorkHours: totals.totalWorkHours,
    totalKm: totals.totalKm,
    totalTrips: totals.totalTrips,
    totalIncome,
    totalTips: toMoney(totals.totalTips),
    vatRate,
    totalVat,
    totalIncomeExVat: toMoney(totals.totalIncomeExVat),
    totalCosts,
    accruedSalary: calculateAccruedSalary(toMoney(totals.totalIncomeExVat)),
  };
}

export function buildMonthlyPayrollState(input: {
  totals: MonthlyPayrollTotals;
  payments?: SalaryPaymentRecord[];
  asOfDate: string;
}): MonthlyPayrollState {
  const payments = input.payments ?? [];
  const totalPaid = calculateTotalPaid(payments);
  const remainingAmount = calculateRemainingSalary(input.totals.accruedSalary, totalPaid);

  return {
    ...input.totals,
    payments,
    totalPaid,
    remainingAmount,
    paymentDate: latestPaymentDate(payments),
    salaryStatus: resolveSalaryStatus({
      year: input.totals.year,
      month: input.totals.month,
      accruedSalary: input.totals.accruedSalary,
      remainingAmount,
      totalPaid,
      asOfDate: input.asOfDate,
    }),
  };
}

export function applySalaryPayment(
  state: MonthlyPayrollState,
  payment: SalaryPaymentRecord,
  asOfDate: string,
): MonthlyPayrollState {
  parseIsoDate(payment.paymentDate);
  const amount = toMoney(assertNonNegative(payment.amount, "Utbetalt belopp kan inte vara negativt."));

  if (amount.isZero()) {
    throw new CalculationError("ZERO_PAYMENT", "Utbetalt belopp måste vara större än 0.");
  }

  const nextPaid = toMoney(state.totalPaid.plus(amount));
  if (nextPaid.greaterThan(state.accruedSalary)) {
    throw new CalculationError(
      "PAYMENT_EXCEEDS_REMAINING",
      "Beloppet överstiger återstående lön.",
    );
  }

  return buildMonthlyPayrollState({
    totals: state,
    payments: [...state.payments, { ...payment, amount }],
    asOfDate,
  });
}

export function getSalaryStatusLabelSv(status: SalaryStatus): string {
  return SALARY_STATUS_LABEL_SV[status];
}

export function formatMonthlySummarySv(state: MonthlyPayrollState): string {
  const monthNames = [
    "JANUARI",
    "FEBRUARI",
    "MARS",
    "APRIL",
    "MAJ",
    "JUNI",
    "JULI",
    "AUGUSTI",
    "SEPTEMBER",
    "OKTOBER",
    "NOVEMBER",
    "DECEMBER",
  ];
  const monthName = monthNames[state.month - 1];

  return [
    `TAXILOG — ${monthName} ${state.year}`,
    "",
    `ARBETSDAGAR:`,
    `${state.totalWorkDays}`,
    "",
    `ARBETSTID:`,
    `${state.totalWorkHours.toString()} h`,
    "",
    `KÖRSTRÄCKA:`,
    `${state.totalKm.toString()} km`,
    "",
    `KÖRNINGAR:`,
    `${state.totalTrips}`,
    "",
    `INKÖRT:`,
    `${formatSvMoney(state.totalIncome)} kr`,
    "",
    `DRICKS:`,
    `${formatSvMoney(state.totalTips)} kr`,
    "",
    `MOMS:`,
    `${formatSvMoney(state.totalVat)} kr`,
    "",
    `EFTER MOMS:`,
    `${formatSvMoney(state.totalIncomeExVat)} kr`,
    "",
    `KOSTNADER:`,
    `${formatSvMoney(state.totalCosts)} kr`,
    "",
    `INNESTÅENDE LÖN:`,
    `${formatSvMoney(state.accruedSalary)} kr`,
    "",
    `UTBETALT:`,
    `${formatSvMoney(state.totalPaid)} kr`,
    "",
    `ÅTERSTÅENDE:`,
    `${formatSvMoney(state.remainingAmount)} kr`,
    "",
    `STATUS:`,
    getSalaryStatusLabelSv(state.salaryStatus),
  ].join("\n");
}

function formatSvMoney(value: Decimal): string {
  const [whole, fraction] = toMoney(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (fraction === "00") {
    return grouped;
  }
  return `${grouped},${fraction}`;
}

export type { YearMonth };
