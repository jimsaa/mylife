import Decimal from "decimal.js";
import { assertNonNegative, toMoney, type DecimalInput } from "./money";

export function calculateTotalIncome(input: {
  cashIncome: DecimalInput;
  cardIncome: DecimalInput;
  swishIncome: DecimalInput;
  otherIncome: DecimalInput;
}): Decimal {
  const cash = assertNonNegative(input.cashIncome, "Kontant kan inte vara negativt.");
  const card = assertNonNegative(input.cardIncome, "Kort kan inte vara negativt.");
  const swish = assertNonNegative(input.swishIncome, "Swish kan inte vara negativt.");
  const other = assertNonNegative(input.otherIncome, "Övrig inkomst kan inte vara negativ.");

  return toMoney(cash.plus(card).plus(swish).plus(other));
}

export function calculateTotalCosts(input: {
  energyCost: DecimalInput;
  otherCosts: DecimalInput;
}): Decimal {
  const energy = assertNonNegative(input.energyCost, "Energikostnad kan inte vara negativ.");
  const other = assertNonNegative(input.otherCosts, "Övriga kostnader kan inte vara negativa.");

  return toMoney(energy.plus(other));
}

export function validateTips(tips: DecimalInput): Decimal {
  return toMoney(assertNonNegative(tips, "Dricks kan inte vara negativ."));
}
