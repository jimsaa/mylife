import Decimal from "decimal.js";
import { CalculationError } from "./errors";
import { assertNonNegative, toDecimal, toMoney, type DecimalInput } from "./money";
import { pad2, parseIsoDate, yearMonthFromDate } from "./period";
import { DEFAULT_PRIVATE_NET_WITHDRAWAL } from "../settings/defaults";

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

export function projectSalarySplit(
  accruedSalary: DecimalInput,
  privateNetTarget: DecimalInput = DEFAULT_PRIVATE_NET_WITHDRAWAL,
) {
  const accrued = toMoney(assertNonNegative(accruedSalary, "Beräknad lön kan inte vara negativ."));
  const target = toMoney(assertNonNegative(privateNetTarget, "Privat uttag kan inte vara negativt."));
  const surplus = Decimal.max(accrued.minus(target), 0);
  const shortfall = Decimal.max(target.minus(accrued), 0);
  const privateNet = Decimal.min(accrued, target);

  return {
    accruedSalary: accrued,
    privateNetTarget: target,
    projectedPrivateNet: toMoney(privateNet),
    projectedSurplus: toMoney(surplus),
    projectedShortfall: toMoney(shortfall),
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
