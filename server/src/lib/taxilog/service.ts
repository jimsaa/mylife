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
import {
  monthPeriod,
  parseIsoDate,
  previousYearMonth,
  salaryPaymentDate,
  yearMonthFromDate,
} from "./calculations/period";
import { CalculationError } from "./calculations/errors";
import {
  isV3Categorized,
  perHour,
  sharePercent,
  sumTotalIncome,
  uncategorizedDrivingGross,
} from "./calculations/incomeSources";
import { toMoney } from "./calculations/money";
import {
  bonusSourceKey,
  migrateHistoricalTips,
  privateGrossPaymentNotes,
  privateNetPaymentNotes,
  projectSalarySplit,
  salaryThresholdProgress,
  summarizeSavings,
  surplusAllocationNotes,
  surplusSourceKey,
  tipsSourceKey,
  upsertSavingsEntry,
  type SavingsLedgerEntry,
} from "./calculations/savings";
import { todayIsoDate } from "./dates/stockholm";
import { formatDailyExport, type TaxiLogDailyImport } from "./import/taxilogImport";
import {
  applyOwnBookingLines,
  linesForDate,
  normalizeDriverId,
  normalizeStoredOwnBookingLines,
  type OwnBookingLineInput,
  type TaxiOwnBookingLine,
} from "./ownBookingLines";
import { calculateDailyFinancials, parseChargingKwh, parseWorkedHours } from "./data/dailyFinancials";
import { DEFAULT_PRIVATE_NET_WITHDRAWAL, DEFAULT_VAT_RATE } from "./settings/defaults";

export const HOME_CHARGING_LOCATION = "Hemma";

export type TaxiWorkDayRecord = {
  date: string;
  workHours: string;
  totalIncome: string;
  ownBookings: string | null;
  otherIncome: string | null;
  handUp: string | null;
  uberIncome: string | null;
  boltIncome: string | null;
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
  ownBookingLines: TaxiOwnBookingLine[];
  dayCorrections: TaxiDayCorrection[];
};

export type TaxiDayCorrection = {
  date: string;
  correctedAt: string;
  changes: { field: string; before: string; after: string }[];
};

export type DailyLogInput = {
  date: string;
  grossIncome: string;
  tips: string;
  workedHours: string;
  chargingKwh?: string;
  ownBookings?: string | null;
  otherIncome?: string | null;
  handUp?: string | null;
  uberIncome?: string | null;
  boltIncome?: string | null;
  bonus?: string | null;
  driverId?: string | null;
  ownBookingLines?: OwnBookingLineInput[] | null;
  correctingDate?: string | null;
  openedFingerprint?: string | null;
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
    ownBookingLines: [],
    dayCorrections: [],
  };
}

export function normalizeTaxiLogState(raw: TaxiLogState): TaxiLogState {
  const workDays = (raw.workDays ?? []).map((day) => ({
    ...day,
    ownBookings: day.ownBookings ?? null,
    otherIncome: day.otherIncome ?? null,
    handUp: day.handUp ?? null,
    uberIncome: day.uberIncome ?? null,
    boltIncome: day.boltIncome ?? null,
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
    ownBookingLines: normalizeStoredOwnBookingLines(raw.ownBookingLines),
    dayCorrections: normalizeDayCorrections(raw.dayCorrections),
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

function correctionDate(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const date = value.trim();
  return date || null;
}

function assertCanSaveWorkDay(state: TaxiLogState, date: string, correctingDate: string | null): void {
  const exists = state.workDays.some((day) => day.date === date);
  if (correctingDate && correctingDate !== date) {
    throw new CalculationError(
      "CORRECTION_DATE_MISMATCH",
      `Korrigeringen gäller ${correctingDate} och kan inte sparas på ${date}.`,
    );
  }
  if (correctingDate && !exists) {
    throw new CalculationError(
      "DAY_NOT_FOUND",
      `Datumet ${date} finns inte sparat. Korrigering kan inte skapa en ny dag.`,
    );
  }
  if (exists && correctingDate !== date) {
    throw new CalculationError(
      "DAY_ALREADY_SAVED",
      `Datumet ${date} är redan sparat. Historiken skrivs inte över. Välj Korrigera dagen om den dagen ska ändras.`,
    );
  }
}

function workDayFingerprint(day: TaxiWorkDayRecord, lines: TaxiOwnBookingLine[]): string {
  const lineKey = lines
    .filter((line) => line.date === day.date && line.driverId == null)
    .map((line) => `${line.bookingId}=${Number(line.amount)}`)
    .sort()
    .join("|");
  return [
    Number(day.workHours),
    Number(day.ownBookings ?? 0),
    Number(day.handUp ?? 0),
    Number(day.uberIncome ?? 0),
    Number(day.boltIncome ?? 0),
    Number(day.tips ?? 0),
    Number(day.bonus ?? 0),
    lineKey,
  ].join(";");
}

function assertOpenedFingerprint(state: TaxiLogState, input: DailyLogInput): void {
  if (typeof input.openedFingerprint !== "string" || !input.openedFingerprint) return;
  const day = state.workDays.find((item) => item.date === input.date);
  if (!day || workDayFingerprint(day, state.ownBookingLines) !== input.openedFingerprint) {
    throw new CalculationError(
      "DAY_CHANGED",
      `Dagen ${input.date} har ändrats sedan den öppnades. Hämta den igen. Ingenting sparades.`,
    );
  }
}

function sameStoredNumber(before: string | null | undefined, after: string | null | undefined): boolean {
  const left = Number(before ?? 0);
  const right = Number(after ?? 0);
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

function normalizeDayCorrections(value: unknown): TaxiDayCorrection[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Partial<TaxiDayCorrection>;
    if (typeof row.date !== "string" || typeof row.correctedAt !== "string" || !Array.isArray(row.changes)) return [];
    const changes = row.changes.flatMap((change) => {
      if (!change || typeof change !== "object") return [];
      const entry = change as { field?: string; before?: string; after?: string };
      if (typeof entry.field !== "string") return [];
      return [{ field: entry.field, before: String(entry.before ?? ""), after: String(entry.after ?? "") }];
    });
    return [{ date: row.date, correctedAt: row.correctedAt, changes }];
  });
}

function dayCorrectionChanges(
  before: TaxiWorkDayRecord,
  after: TaxiWorkDayRecord,
  beforeLines: TaxiOwnBookingLine[],
  afterLines: TaxiOwnBookingLine[],
): TaxiDayCorrection["changes"] {
  const changes: TaxiDayCorrection["changes"] = [];
  const fields: Array<[string, string | null | undefined, string | null | undefined]> = [
    ["Arbetad tid", before.workHours, after.workHours],
    ["Egen Kund", before.ownBookings, after.ownBookings],
    ["H-Up", before.handUp, after.handUp],
    ["Uber", before.uberIncome, after.uberIncome],
    ["Bolt", before.boltIncome, after.boltIncome],
    ["Dricks", before.tips, after.tips],
    ["Bonusar", before.bonus, after.bonus],
  ];
  for (const [field, previous, next] of fields) {
    if (!sameStoredNumber(previous, next)) changes.push({ field, before: previous ?? "", after: next ?? "" });
  }
  const previousById = new Map(beforeLines.map((line) => [line.bookingId, line.amount]));
  const nextById = new Map(afterLines.map((line) => [line.bookingId, line.amount]));
  for (const [bookingId, amount] of nextById) {
    const previous = previousById.get(bookingId);
    if (previous === undefined) changes.push({ field: `Bokning ${bookingId}`, before: "", after: amount });
    else if (!sameStoredNumber(previous, amount)) changes.push({ field: `Bokning ${bookingId}`, before: previous, after: amount });
  }
  for (const [bookingId, amount] of previousById) {
    if (!nextById.has(bookingId)) changes.push({ field: `Bokning ${bookingId}`, before: amount, after: "" });
  }
  return changes;
}

export function saveDailyLogToState(state: TaxiLogState, input: DailyLogInput): TaxiLogState {
  parseIsoDate(input.date);
  const normalized = normalizeTaxiLogState(state);
  const period = yearMonthFromDate(input.date);
  assertMonthUnlocked(normalized, period.year, period.month);
  assertCanSaveWorkDay(normalized, input.date, correctionDate(input.correctingDate));
  assertOpenedFingerprint(normalized, input);
  const driverId = normalizeDriverId(input.driverId);
  if (driverId !== null) {
    return {
      ...normalized,
      ownBookingLines: applyOwnBookingLines(normalized.ownBookingLines, {
        date: input.date,
        driverId,
        ownBookingLines: input.ownBookingLines,
      }),
    };
  }

  const vatRate = normalized.vatRate || DEFAULT_VAT_RATE;
  const financials = calculateDailyFinancials({
    grossIncome: input.grossIncome,
    tips: input.tips,
    bonus: input.bonus ?? "0",
    vatRate,
  });
  const workedHours = parseWorkedHours(input.workedHours);
  const bonus = input.bonus === undefined ? null : financials.bonus.toFixed(2);
  const ownBookings = input.ownBookings === undefined ? null : input.ownBookings;
  const otherIncome = input.otherIncome === undefined ? null : input.otherIncome;
  const handUp = input.handUp === undefined ? null : input.handUp;
  const uberIncome = input.uberIncome === undefined ? null : input.uberIncome;
  const boltIncome = input.boltIncome === undefined ? null : input.boltIncome;

  const workDay: TaxiWorkDayRecord = {
    date: input.date,
    workHours: workedHours.toString(),
    totalIncome: financials.totalIncome.toFixed(2),
    ownBookings,
    otherIncome,
    handUp,
    uberIncome,
    boltIncome,
    tips: financials.tips.toFixed(2),
    bonus,
    vatRate: financials.vatRate.toString(),
    vatAmount: financials.vatAmount.toFixed(2),
    incomeExVat: financials.incomeExVat.toFixed(2),
    totalCosts: "0.00",
    totalKm: "0",
    numberOfTrips: 0,
  };

  let charging = normalized.charging.filter(
    (session) => !(session.date === input.date && session.location === HOME_CHARGING_LOCATION),
  );
  if (input.chargingKwh !== undefined && input.chargingKwh !== "") {
    charging = [
      ...charging,
      {
        date: input.date,
        kwh: parseChargingKwh(input.chargingKwh).toString(),
        location: HOME_CHARGING_LOCATION,
      },
    ];
  } else {
    charging = normalized.charging;
  }

  const next: TaxiLogState = applyDaySavings(
    {
      ...normalized,
      workDays: [...normalized.workDays.filter((day) => day.date !== input.date), workDay],
      charging,
    },
    input.date,
    financials.tips.toFixed(2),
    bonus,
  );

  const saved = syncPayrollInState(next, period.year, period.month, todayIsoDate());
  const ownBookingLines = applyOwnBookingLines(normalized.ownBookingLines, {
    date: input.date,
    driverId: null,
    ownBookingLines: input.ownBookingLines,
  });
  const previousDay = normalized.workDays.find((day) => day.date === input.date);
  const changes = previousDay
    ? dayCorrectionChanges(
        previousDay,
        workDay,
        normalized.ownBookingLines.filter((line) => line.date === input.date && line.driverId === null),
        ownBookingLines.filter((line) => line.date === input.date && line.driverId === null),
      )
    : [];
  return {
    ...saved,
    ownBookingLines,
    dayCorrections: changes.length === 0
      ? normalized.dayCorrections
      : [...normalized.dayCorrections, { date: input.date, correctedAt: new Date().toISOString(), changes }],
  };
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

  const bonus = workDay?.bonus ?? null;
  const tips = workDay?.tips ?? "0";
  const grossIncome = workDay?.totalIncome ?? "0";
  return {
    date,
    grossIncome,
    ownBookings: workDay?.ownBookings ?? null,
    otherIncome: workDay?.otherIncome ?? null,
    handUp: workDay?.handUp ?? null,
    uberIncome: workDay?.uberIncome ?? null,
    boltIncome: workDay?.boltIncome ?? null,
    netIncome: workDay?.incomeExVat ?? "0",
    vatAmount: workDay?.vatAmount ?? "0",
    vatRate: workDay?.vatRate ?? normalized.vatRate,
    tips,
    bonus,
    totalIncome: sumTotalIncome(grossIncome, bonus ?? "0", tips).totalIncome.toFixed(2),
    workedHours: workDay?.workHours ?? "0",
    chargingKwh: charging?.kwh ?? "0",
    sourceCategorized: workDay ? isV3Categorized(workDay) : false,
    ownBookingLines: linesForDate(normalized.ownBookingLines, date),
    corrections: normalized.dayCorrections.filter((entry) => entry.date === date),
    fingerprint: workDay ? workDayFingerprint(workDay, normalized.ownBookingLines) : "",
  };
}

export function loadMonthOverviewFromState(
  state: TaxiLogState,
  year: number,
  month: number,
  options: { includeNextPayment?: boolean } = {},
) {
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
  const handUp = sumKnown(workDays.map((day) => day.handUp));
  const uberIncome = sumKnown(workDays.map((day) => day.uberIncome));
  const boltIncome = sumKnown(workDays.map((day) => day.boltIncome));
  const bonus = sumKnown(workDays.map((day) => day.bonus));
  const categorizedDays = workDays.filter(isV3Categorized);
  const categorizedOwn = sumKnown(categorizedDays.map((day) => day.ownBookings));
  const categorizedHandUp = sumKnown(categorizedDays.map((day) => day.handUp));
  const categorizedUber = sumKnown(categorizedDays.map((day) => day.uberIncome));
  const categorizedBolt = sumKnown(categorizedDays.map((day) => day.boltIncome));
  const categorizedGross = categorizedDays.reduce(
    (sum, day) => sum.plus(day.totalIncome || 0),
    new Decimal(0),
  );
  const uncategorizedGross = uncategorizedDrivingGross(workDays);
  const hours = payroll.totalWorkHours;
  const liveSplit = projectSalarySplit(payroll.accruedSalary);
  const existing = normalized.payrolls.find((row) => row.year === year && row.month === month);
  const savings = summarizeSavings(normalized.savingsLedger, year, month);
  const privateGrossNotes = privateGrossPaymentNotes(year, month);
  const privateNetNotes = privateNetPaymentNotes(year, month);
  const privateGrossTaken = normalized.payments
    .filter((payment) => payment.year === year && payment.month === month && payment.notes === privateGrossNotes)
    .reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
  const privateNetLegacyTaken = normalized.payments
    .filter((payment) => payment.year === year && payment.month === month && payment.notes === privateNetNotes)
    .reduce((sum, payment) => sum.plus(payment.amount), new Decimal(0));
  const lockedSurplus = toMoney(
    normalized.savingsLedger
      .filter((entry) => entry.kind === "SALARY_SURPLUS" && entry.year === year && entry.month === month)
      .reduce((sum, entry) => sum.plus(entry.amount), new Decimal(0)),
  );
  const split =
    existing?.settlementLocked && privateGrossTaken.eq(0) && privateNetLegacyTaken.greaterThan(0)
      ? {
          ...liveSplit,
          privateGrossAllocation: toMoney(privateNetLegacyTaken),
          preliminaryTax: toMoney(0),
          projectedPrivateNet: toMoney(privateNetLegacyTaken),
          projectedSurplus: lockedSurplus,
          projectedShortfall: toMoney(0),
        }
      : liveSplit;
  const privateNetTaken = existing?.settlementLocked
    ? privateGrossTaken.greaterThan(0)
      ? split.projectedPrivateNet
      : toMoney(privateNetLegacyTaken)
    : toMoney(0);
  const progress = salaryThresholdProgress(payroll.accruedSalary);
  const includeNextPayment = options.includeNextPayment !== false;
  const previous = previousYearMonth(year, month);
  const previousOverview = includeNextPayment
    ? loadMonthOverviewFromState(normalized, previous.year, previous.month, { includeNextPayment: false })
    : null;

  return {
    year,
    month,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    grossIncome: payroll.totalIncome.toString(),
    ownBookings: own.value,
    otherIncome: other.value,
    handUp: handUp.value,
    uberIncome: uberIncome.value,
    boltIncome: boltIncome.value,
    totalIncome: sumTotalIncome(payroll.totalIncome, bonus.value ?? "0", payroll.totalTips).totalIncome.toFixed(2),
    uncategorizedGross,
    sourceShares: {
      ownBookings: sharePercent(categorizedOwn.value, categorizedGross),
      handUp: sharePercent(categorizedHandUp.value, categorizedGross),
      uberIncome: sharePercent(categorizedUber.value, categorizedGross),
      boltIncome: sharePercent(categorizedBolt.value, categorizedGross),
    },
    incomePerHour: {
      driving: perHour(payroll.totalIncome, hours),
      ownBookings: perHour(own.value, hours),
      handUp: perHour(handUp.value, hours),
      uberIncome: perHour(uberIncome.value, hours),
      boltIncome: perHour(boltIncome.value, hours),
      bonus: perHour(bonus.value, hours),
      tips: perHour(payroll.totalTips, hours),
    },
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
    privateGrossTarget: split.privateGrossTarget.toFixed(2),
    privateGrossAllocation: split.privateGrossAllocation.toFixed(2),
    preliminaryTax: split.preliminaryTax.toFixed(2),
    projectedPrivateNet: split.projectedPrivateNet.toFixed(2),
    projectedSurplus: split.projectedSurplus.toFixed(2),
    projectedShortfall: split.projectedShortfall.toFixed(2),
    privateNetTaken: toMoney(privateNetTaken).toFixed(2),
    expectedPaymentDate: salaryPaymentDate(year, month),
    remainingToThreshold: progress.remainingToThreshold.toFixed(2),
    additionalGrossIncomeRequired: progress.additionalGrossIncomeRequired.toFixed(2),
    salaryProgressPercent: progress.progressPercent,
    nextPayment: previousOverview
      ? {
          earningYear: previousOverview.year,
          earningMonth: previousOverview.month,
          periodStart: previousOverview.periodStart,
          periodEnd: previousOverview.periodEnd,
          paymentDate: salaryPaymentDate(previousOverview.year, previousOverview.month),
          accruedSalary: previousOverview.accruedSalary,
          privateGrossAllocation: previousOverview.privateGrossAllocation,
          preliminaryTax: previousOverview.preliminaryTax,
          expectedNetPayout: previousOverview.projectedPrivateNet,
          salarySurplus: previousOverview.projectedSurplus,
          settlementLocked: previousOverview.settlementLocked,
        }
      : null,
    settlementLocked: existing?.settlementLocked ?? false,
    settlementLockedAt: existing?.settlementLockedAt ?? null,
    savings,
    days: workDays.map((day) => ({
      date: day.date,
      grossIncome: day.totalIncome,
      ownBookings: day.ownBookings,
      otherIncome: day.otherIncome,
      handUp: day.handUp,
      uberIncome: day.uberIncome,
      boltIncome: day.boltIncome,
      netIncome: day.incomeExVat,
      tips: day.tips,
      bonus: day.bonus,
      totalIncome: sumTotalIncome(day.totalIncome, day.bonus ?? "0", day.tips).totalIncome.toFixed(2),
      workedHours: day.workHours,
      chargingKwh: chargingByDate.get(day.date) ?? "0",
      sourceCategorized: isV3Categorized(day),
    })),
  };
}

export function buildDailyExportFromState(state: TaxiLogState, date: string): string | null {
  const log = loadDailyLogFromState(state, date);
  if (!log) {
    return null;
  }
  const exportInput: TaxiLogDailyImport = {
    version: log.sourceCategorized ? "3" : log.ownBookings !== null || log.bonus ? "2" : "1",
    date: log.date,
    grossIncome: log.grossIncome,
    ownBookings: log.ownBookings,
    otherIncome: log.otherIncome,
    handUp: log.handUp,
    uberIncome: log.uberIncome,
    boltIncome: log.boltIncome,
    tips: log.tips,
    bonus: log.bonus ?? "0",
    workedHours: log.workedHours,
    chargingKwh: log.chargingKwh,
    totalIncome: log.totalIncome,
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

  const grossNotes = privateGrossPaymentNotes(year, month);
  const alreadyPaid = next.payments.some(
    (payment) =>
      payment.year === year &&
      payment.month === month &&
      (payment.notes === grossNotes || payment.notes === privateNetPaymentNotes(year, month)),
  );
  const paymentDate = salaryPaymentDate(year, month);
  if (!alreadyPaid && toMoney(overview.privateGrossAllocation).greaterThan(0)) {
    next = recordSalaryPaymentInState(next, year, month, {
      paymentDate,
      amount: overview.privateGrossAllocation,
      notes: grossNotes,
    });
  }

  const surplusNotes = surplusAllocationNotes(year, month);
  const surplusAlreadyAllocated = next.payments.some(
    (payment) => payment.year === year && payment.month === month && payment.notes === surplusNotes,
  );
  if (!surplusAlreadyAllocated && toMoney(overview.projectedSurplus).greaterThan(0)) {
    next = recordSalaryPaymentInState(next, year, month, {
      paymentDate,
      amount: overview.projectedSurplus,
      notes: surplusNotes,
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
  const settlementNotes = new Set([
    privateGrossPaymentNotes(year, month),
    privateNetPaymentNotes(year, month),
    surplusAllocationNotes(year, month),
  ]);
  const surplusKey = surplusSourceKey(year, month);
  const unlocked: TaxiLogState = {
    ...normalized,
    payments: normalized.payments.filter(
      (payment) => !(payment.year === year && payment.month === month && payment.notes !== null && settlementNotes.has(payment.notes)),
    ),
    savingsLedger: normalized.savingsLedger.filter((entry) => entry.sourceKey !== surplusKey),
    payrolls: normalized.payrolls.map((payroll) =>
      payroll.year === year && payroll.month === month
        ? { ...payroll, settlementLocked: false, settlementLockedAt: null }
        : payroll,
    ),
  };
  return syncPayrollInState(unlocked, year, month, todayIsoDate());
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
  const totals = sumTotalIncome(financials.totalIncome, financials.bonus, financials.tips);
  return {
    parsed,
    preview: {
      grossIncome: financials.totalIncome.toString(),
      ownBookings: parsed.ownBookings,
      otherIncome: parsed.otherIncome,
      handUp: parsed.handUp,
      uberIncome: parsed.uberIncome,
      boltIncome: parsed.boltIncome,
      vatAmount: financials.vatAmount.toFixed(2),
      netIncome: financials.incomeExVat.toFixed(2),
      tips: financials.tips.toFixed(2),
      bonus: financials.bonus.toFixed(2),
      totalIncome: totals.totalIncome.toFixed(2),
      workedHours: parsed.workedHours,
      estimatedSalary: calculateAccruedSalary(financials.incomeExVat).toFixed(2),
      savingsFromDay: financials.tips.plus(financials.bonus).toFixed(2),
    },
  };
}
