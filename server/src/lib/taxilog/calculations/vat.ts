import Decimal from "decimal.js";
import { assertNonNegative, toDecimal, toMoney, type DecimalInput } from "./money";

/**
 * VAT is isolated here so the accounting model can change later
 * without touching UI code.
 *
 * POC model: VAT = TOTAL_INCOME × VAT_RATE
 * vatRate is a percent value (6 means 6%).
 */
export function calculateVatAmount(
  totalIncome: DecimalInput,
  vatRatePercent: DecimalInput,
): Decimal {
  const income = assertNonNegative(totalIncome, "Inkomst kan inte vara negativ.");
  const rate = assertNonNegative(vatRatePercent, "Momssatsen kan inte vara negativ.");
  return toMoney(income.times(rate).dividedBy(100));
}

export function calculateIncomeExVat(
  totalIncome: DecimalInput,
  vatAmount: DecimalInput,
): Decimal {
  const income = assertNonNegative(totalIncome, "Inkomst kan inte vara negativ.");
  const vat = assertNonNegative(vatAmount, "Momsbeloppet kan inte vara negativt.");
  return toMoney(income.minus(vat));
}

export function calculateVatBreakdown(
  totalIncome: DecimalInput,
  vatRatePercent: DecimalInput,
): { vatRate: Decimal; vatAmount: Decimal; incomeExVat: Decimal } {
  const vatRate = toDecimal(vatRatePercent);
  const vatAmount = calculateVatAmount(totalIncome, vatRate);
  const incomeExVat = calculateIncomeExVat(totalIncome, vatAmount);

  return { vatRate, vatAmount, incomeExVat };
}
