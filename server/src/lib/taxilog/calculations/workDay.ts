import Decimal from "decimal.js";
import { calculateTotalCosts, calculateTotalIncome, validateTips } from "./income";
import { calculateWorkDayMetrics, type WorkDayMetrics } from "./metrics";
import { type DecimalInput, toDecimal } from "./money";
import { calculateVatBreakdown } from "./vat";
import { calculateTotalKm, calculateWorkHours, validateTripCount } from "./work";

export type WorkDayInput = {
  date: string;
  startTime: string;
  endTime: string;
  startOdometer: DecimalInput;
  endOdometer: DecimalInput;
  numberOfTrips: DecimalInput;
  cashIncome: DecimalInput;
  cardIncome: DecimalInput;
  swishIncome: DecimalInput;
  otherIncome: DecimalInput;
  tips: DecimalInput;
  energyCost: DecimalInput;
  otherCosts: DecimalInput;
  vatRate: DecimalInput;
  notes?: string | null;
};

export type CalculatedWorkDay = {
  date: string;
  startTime: string;
  endTime: string;
  workHours: Decimal;
  startOdometer: Decimal;
  endOdometer: Decimal;
  totalKm: Decimal;
  numberOfTrips: number;
  cashIncome: Decimal;
  cardIncome: Decimal;
  swishIncome: Decimal;
  otherIncome: Decimal;
  totalIncome: Decimal;
  tips: Decimal;
  vatRate: Decimal;
  vatAmount: Decimal;
  incomeExVat: Decimal;
  energyCost: Decimal;
  otherCosts: Decimal;
  totalCosts: Decimal;
  notes: string | null;
  metrics: WorkDayMetrics;
};

export function calculateWorkDay(input: WorkDayInput): CalculatedWorkDay {
  const workHours = calculateWorkHours(input.startTime, input.endTime);
  const totalKm = calculateTotalKm(input.startOdometer, input.endOdometer);
  const numberOfTrips = validateTripCount(input.numberOfTrips);
  const cashIncome = toDecimal(input.cashIncome);
  const cardIncome = toDecimal(input.cardIncome);
  const swishIncome = toDecimal(input.swishIncome);
  const otherIncome = toDecimal(input.otherIncome);
  const totalIncome = calculateTotalIncome({
    cashIncome,
    cardIncome,
    swishIncome,
    otherIncome,
  });
  const tips = validateTips(input.tips);
  const vat = calculateVatBreakdown(totalIncome, input.vatRate);
  const energyCost = toDecimal(input.energyCost);
  const otherCosts = toDecimal(input.otherCosts);
  const totalCosts = calculateTotalCosts({ energyCost, otherCosts });

  return {
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    workHours,
    startOdometer: toDecimal(input.startOdometer),
    endOdometer: toDecimal(input.endOdometer),
    totalKm,
    numberOfTrips,
    cashIncome,
    cardIncome,
    swishIncome,
    otherIncome,
    totalIncome,
    tips,
    vatRate: vat.vatRate,
    vatAmount: vat.vatAmount,
    incomeExVat: vat.incomeExVat,
    energyCost,
    otherCosts,
    totalCosts,
    notes: input.notes ?? null,
    metrics: calculateWorkDayMetrics({
      totalIncome,
      tips,
      totalCosts,
      workHours,
      totalKm,
      numberOfTrips,
    }),
  };
}
