import Decimal from "decimal.js";
import { CalculationError } from "./errors";
import { assertNonNegative, toDecimal, toMoney, type DecimalInput } from "./money";
import { pad2, parseIsoDate, yearMonthFromDate } from "./period";
import { DEFAULT_SALARY_RATE, DEFAULT_VAT_RATE } from "../settings/defaults";
import {
  PRIVATE_GROSS_THRESHOLD,
  PRIVATE_NET_PAYOUT,
  PRIVATE_THRESHOLD_TAX,
} from "./taxTable33_2026";

export const SAVINGS_KINDS = [
  "TIPS",
  "BONUS",
  "SALARY_SURPLUS",
  "MANUAL_DEPOSIT",
  "MANUAL_WITHDRAWAL",
] as const;

export type SavingsKind = (typeof SAVINGS_KINDS)[number];

export type SavingsLedgerEntry = {
  id: string;
  occurredAt: string;
  year: number;
  month: number;
  kind: SavingsKind;
  amount: string;
  sourceKey: string;
  description: string;
};

export function tipsSourceKey(date: string): string {
  return `tips:${date}`;
}

export function bonusSourceKey(date: string): string {
  return `bonus:${date}`;
}

export function surplusSourceKey(year: number, month: number): string {
  return `salary-surplus:${year}-${pad2(month)}`;
}

export function privateNetPaymentNotes(year: number, month: number): string {
  return `PRIVATE_NET:${year}-${pad2(month)}`;
}

export function privateGrossPaymentNotes(year: number, month: number): string {
  return `PRIVATE_GROSS:${year}-${pad2(month)}`;
}

export function surplusAllocationNotes(year: number, month: number): string {
  return `SALARY_SURPLUS_ALLOC:${year}-${pad2(month)}`;
}

export function projectSalarySplit(accruedSalary: DecimalInput) {
  const accrued = toMoney(assertNonNegative(accruedSalary, "Beräknad lön kan inte vara negativ."));
  const grossTarget = toMoney(PRIVATE_GROSS_THRESHOLD);
  const netTarget = toMoney(PRIVATE_NET_PAYOUT);
  const reachedThreshold = accrued.greaterThanOrEqualTo(grossTarget);
  const privateGross = reachedThreshold ? grossTarget : accrued;
  const privateTax = reachedThreshold ? toMoney(PRIVATE_THRESHOLD_TAX) : toMoney(0);
  const privateNet = reachedThreshold ? netTarget : toMoney(0);
  const surplus = Decimal.max(accrued.minus(grossTarget), 0);
  const shortfallNet = reachedThreshold ? toMoney(0) : toMoney(grossTarget.minus(accrued));

  return {
    accruedSalary: accrued,
    privateGrossTarget: grossTarget,
    privateGrossAllocation: toMoney(privateGross),
    preliminaryTax: toMoney(privateTax),
    privateNetTarget: netTarget,
    projectedPrivateNet: privateNet,
    projectedSurplus: toMoney(surplus),
    projectedShortfall: toMoney(shortfallNet),
  };
}

export function salaryThresholdProgress(accruedSalary: DecimalInput) {
  const accrued = toMoney(assertNonNegative(accruedSalary, "Beräknad lön kan inte vara negativ."));
  const target = toMoney(PRIVATE_GROSS_THRESHOLD);
  const remaining = Decimal.max(target.minus(accrued), 0);
  const vatFactor = new Decimal(100).minus(DEFAULT_VAT_RATE).dividedBy(100);
  const salaryFactor = toDecimal(DEFAULT_SALARY_RATE).dividedBy(100);
  const additionalGross = remaining.isZero()
    ? toMoney(0)
    : toMoney(remaining.dividedBy(salaryFactor).dividedBy(vatFactor));
  const progressPercent = accrued.greaterThanOrEqualTo(target)
    ? "100.0"
    : accrued.dividedBy(target).times(100).toFixed(1);

  return {
    remainingToThreshold: toMoney(remaining),
    additionalGrossIncomeRequired: additionalGross,
    progressPercent,
  };
}

export function upsertSavingsEntry(
  entries: SavingsLedgerEntry[],
  input: {
    occurredAt: string;
    kind: SavingsKind;
    amount: DecimalInput;
    sourceKey: string;
    description: string;
  },
): SavingsLedgerEntry[] {
  parseIsoDate(input.occurredAt);
  const amount = toMoney(input.amount);
  if (amount.isZero()) {
    return entries.filter((entry) => entry.sourceKey !== input.sourceKey);
  }
  if (input.kind !== "MANUAL_WITHDRAWAL" && amount.isNegative()) {
    throw new CalculationError("NEGATIVE_VALUE", "Beloppet kan inte vara negativt.");
  }

  const without = entries.filter((entry) => entry.sourceKey !== input.sourceKey);
  const period = yearMonthFromDate(input.occurredAt);
  const signed =
    input.kind === "MANUAL_WITHDRAWAL" ? toMoney(amount.abs().negated()) : amount;

  if (input.kind === "MANUAL_WITHDRAWAL") {
    const nextBalance = savingsBalance(without).plus(signed);
    if (nextBalance.isNegative()) {
      throw new CalculationError("NEGATIVE_SAVINGS", "Uttaget överstiger sparkontot.");
    }
  }

  return [
    ...without,
    {
      id: input.sourceKey,
      occurredAt: input.occurredAt,
      year: period.year,
      month: period.month,
      kind: input.kind,
      amount: signed.toFixed(2),
      sourceKey: input.sourceKey,
      description: input.description,
    },
  ];
}

export function savingsBalance(entries: SavingsLedgerEntry[]): Decimal {
  return toMoney(entries.reduce((sum, entry) => sum.plus(toDecimal(entry.amount)), new Decimal(0)));
}

export function sumByKind(entries: SavingsLedgerEntry[], kind: SavingsKind): Decimal {
  return toMoney(
    entries
      .filter((entry) => entry.kind === kind)
      .reduce((sum, entry) => sum.plus(toDecimal(entry.amount)), new Decimal(0)),
  );
}

export function summarizeSavings(entries: SavingsLedgerEntry[], year?: number, month?: number) {
  const monthEntries =
    year && month ? entries.filter((entry) => entry.year === year && entry.month === month) : entries;

  return {
    total: savingsBalance(entries).toFixed(2),
    fromTips: sumByKind(entries, "TIPS").toFixed(2),
    fromBonus: sumByKind(entries, "BONUS").toFixed(2),
    fromSalarySurplus: sumByKind(entries, "SALARY_SURPLUS").toFixed(2),
    fromManualDeposits: sumByKind(entries, "MANUAL_DEPOSIT").toFixed(2),
    fromManualWithdrawals: sumByKind(entries, "MANUAL_WITHDRAWAL").toFixed(2),
    monthTotal: savingsBalance(monthEntries).toFixed(2),
    monthTips: sumByKind(monthEntries, "TIPS").toFixed(2),
    monthBonus: sumByKind(monthEntries, "BONUS").toFixed(2),
    monthSalarySurplus: sumByKind(monthEntries, "SALARY_SURPLUS").toFixed(2),
    history: [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.sourceKey.localeCompare(b.sourceKey)),
    growth: savingsGrowth(entries),
  };
}

export function savingsGrowth(entries: SavingsLedgerEntry[]): Array<{ year: number; month: number; balance: string }> {
  const sorted = [...entries].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.sourceKey.localeCompare(b.sourceKey));
  const byMonth = new Map<string, Decimal>();
  let running = new Decimal(0);

  for (const entry of sorted) {
    running = running.plus(entry.amount);
    byMonth.set(`${entry.year}-${pad2(entry.month)}`, toMoney(running));
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, balance]) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month, balance: balance.toFixed(2) };
    });
}

export function migrateHistoricalTips(
  entries: SavingsLedgerEntry[],
  days: Array<{ date: string; tips: string }>,
): SavingsLedgerEntry[] {
  return days.reduce((current, day) => {
    const tips = toMoney(day.tips || "0");
    if (tips.isZero()) {
      return current;
    }
    return upsertSavingsEntry(current, {
      occurredAt: day.date,
      kind: "TIPS",
      amount: tips,
      sourceKey: tipsSourceKey(day.date),
      description: `Dricks ${day.date}`,
    });
  }, entries);
}
