import { calculateTotalIncome, validateTips } from "../calculations/income";
import { assertNonNegative } from "../calculations/money";
import { calculateVatBreakdown } from "../calculations/vat";
import { normalizeUserNumber } from "../format/display";

export function calculateDailyFinancials(input: {
  grossIncome: string;
  tips: string;
  vatRate: string;
}) {
  const totalIncome = calculateTotalIncome({
    cashIncome: "0",
    cardIncome: "0",
    swishIncome: "0",
    otherIncome: normalizeUserNumber(input.grossIncome),
  });
  const tips = validateTips(normalizeUserNumber(input.tips));
  const vat = calculateVatBreakdown(totalIncome, input.vatRate);

  return {
    totalIncome,
    tips,
    vatRate: vat.vatRate,
    vatAmount: vat.vatAmount,
    incomeExVat: vat.incomeExVat,
  };
}

export function parseChargingKwh(value: string) {
  return assertNonNegative(normalizeUserNumber(value), "kWh kan inte vara negativt.");
}

export function parseWorkedHours(value: string) {
  return assertNonNegative(normalizeUserNumber(value), "Arbetad tid kan inte vara negativ.");
}
