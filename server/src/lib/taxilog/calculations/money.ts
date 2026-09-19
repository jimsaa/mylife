import Decimal from "decimal.js";
import { CalculationError } from "./errors";

export type DecimalInput = Decimal.Value;

export function toDecimal(value: DecimalInput): Decimal {
  try {
    const decimal = value instanceof Decimal ? value : new Decimal(value);
    if (!decimal.isFinite()) {
      throw new Error("not finite");
    }
    return decimal;
  } catch {
    throw new CalculationError("INVALID_NUMBER", "Ogiltigt tal.");
  }
}

export function toMoney(value: DecimalInput): Decimal {
  return toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function assertNonNegative(
  value: DecimalInput,
  messageSv: string,
): Decimal {
  const decimal = toDecimal(value);
  if (decimal.isNegative()) {
    throw new CalculationError("NEGATIVE_VALUE", messageSv);
  }
  return decimal;
}

