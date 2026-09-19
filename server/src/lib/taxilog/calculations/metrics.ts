import Decimal from "decimal.js";
import { toDecimal, type DecimalInput } from "./money";

export function calculatePerUnit(
  amount: DecimalInput,
  divisor: DecimalInput,
): Decimal | null {
  const value = toDecimal(amount);
  const unit = toDecimal(divisor);

  if (unit.isZero()) {
    return null;
  }

  return value.dividedBy(unit);
}

export type WorkDayMetrics = {
  incomePerHour: Decimal | null;
  incomePerKm: Decimal | null;
  costPerHour: Decimal | null;
  costPerKm: Decimal | null;
  tipsPerHour: Decimal | null;
  tipsPerTrip: Decimal | null;
};

export function calculateWorkDayMetrics(input: {
  totalIncome: DecimalInput;
  tips: DecimalInput;
  totalCosts: DecimalInput;
  workHours: DecimalInput;
  totalKm: DecimalInput;
  numberOfTrips: DecimalInput;
}): WorkDayMetrics {
  return {
    incomePerHour: calculatePerUnit(input.totalIncome, input.workHours),
    incomePerKm: calculatePerUnit(input.totalIncome, input.totalKm),
    costPerHour: calculatePerUnit(input.totalCosts, input.workHours),
    costPerKm: calculatePerUnit(input.totalCosts, input.totalKm),
    tipsPerHour: calculatePerUnit(input.tips, input.workHours),
    tipsPerTrip: calculatePerUnit(input.tips, input.numberOfTrips),
  };
}
