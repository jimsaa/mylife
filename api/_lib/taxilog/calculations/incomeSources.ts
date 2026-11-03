import Decimal from "decimal.js";
import { assertNonNegative, toDecimal, toMoney, type DecimalInput } from "./money";

export type DrivingIncomeSources = {
  ownBookings: DecimalInput;
  handUp: DecimalInput;
  uberIncome: DecimalInput;
  boltIncome: DecimalInput;
};

export function sumDrivingGross(sources: DrivingIncomeSources) {
  const ownBookings = toMoney(assertNonNegative(sources.ownBookings, "OWN_BOOKINGS kan inte vara negativt."));
  const handUp = toMoney(assertNonNegative(sources.handUp, "HAND_UP kan inte vara negativt."));
  const uberIncome = toMoney(assertNonNegative(sources.uberIncome, "UBER_INCOME kan inte vara negativt."));
  const boltIncome = toMoney(assertNonNegative(sources.boltIncome, "BOLT_INCOME kan inte vara negativt."));
  return {
    ownBookings,
    handUp,
    uberIncome,
    boltIncome,
    grossIncome: toMoney(ownBookings.plus(handUp).plus(uberIncome).plus(boltIncome)),
  };
}

export function sumTotalIncome(grossIncome: DecimalInput, bonus: DecimalInput, tips: DecimalInput) {
  const gross = toMoney(assertNonNegative(grossIncome, "Körintäkter kan inte vara negativa."));
  const bonusAmount = toMoney(assertNonNegative(bonus, "Bonus kan inte vara negativ."));
  const tipsAmount = toMoney(assertNonNegative(tips, "Dricks kan inte vara negativ."));
  return {
    grossIncome: gross,
    bonus: bonusAmount,
    tips: tipsAmount,
    totalIncome: toMoney(gross.plus(bonusAmount).plus(tipsAmount)),
  };
}

export function isV3Categorized(day: {
  ownBookings?: string | null;
  handUp?: string | null;
  uberIncome?: string | null;
  boltIncome?: string | null;
}): boolean {
  return (
    day.ownBookings !== null &&
    day.ownBookings !== undefined &&
    day.handUp !== null &&
    day.handUp !== undefined &&
    day.uberIncome !== null &&
    day.uberIncome !== undefined &&
    day.boltIncome !== null &&
    day.boltIncome !== undefined
  );
}

export function sharePercent(part: DecimalInput | null | undefined, whole: DecimalInput | null | undefined): string | null {
  if (part === null || part === undefined || whole === null || whole === undefined) {
    return null;
  }
  const total = toMoney(whole);
  if (total.isZero()) {
    return null;
  }
  return toMoney(part).dividedBy(total).times(100).toFixed(1);
}

export function perHour(amount: DecimalInput | null | undefined, hours: DecimalInput): string | null {
  if (amount === null || amount === undefined) {
    return null;
  }
  const worked = toDecimal(hours);
  if (worked.lte(0)) {
    return null;
  }
  return toMoney(toDecimal(amount).dividedBy(worked)).toFixed(2);
}

export function uncategorizedDrivingGross(
  days: Array<{ totalIncome: string; ownBookings?: string | null; handUp?: string | null; uberIncome?: string | null; boltIncome?: string | null }>,
): string | null {
  const uncategorized = days.filter((day) => !isV3Categorized(day));
  if (uncategorized.length === 0) {
    return days.length === 0 ? null : "0.00";
  }
  return uncategorized
    .reduce((sum, day) => sum.plus(day.totalIncome || 0), new Decimal(0))
    .toFixed(2);
}
