import type Decimal from "decimal.js";
import { CalculationError } from "./errors";
import { assertNonNegative, toDecimal, toMoney, type DecimalInput } from "./money";

export function calculateChargingCost(
  kwh: DecimalInput,
  pricePerKwh: DecimalInput,
): Decimal {
  const energy = assertNonNegative(kwh, "kWh kan inte vara negativt.");
  const price = assertNonNegative(pricePerKwh, "Pris per kWh kan inte vara negativt.");
  return toMoney(energy.times(price));
}

export function resolveChargingCost(input: {
  kwh?: DecimalInput | null;
  pricePerKwh?: DecimalInput | null;
  manualTotalCost?: DecimalInput | null;
}): Decimal {
  const hasKwh = input.kwh !== null && input.kwh !== undefined && input.kwh !== "";
  const hasPrice =
    input.pricePerKwh !== null &&
    input.pricePerKwh !== undefined &&
    input.pricePerKwh !== "";

  if (hasKwh && hasPrice) {
    return calculateChargingCost(input.kwh as DecimalInput, input.pricePerKwh as DecimalInput);
  }

  if (input.manualTotalCost !== null && input.manualTotalCost !== undefined && input.manualTotalCost !== "") {
    return toMoney(assertNonNegative(input.manualTotalCost, "Laddningskostnad kan inte vara negativ."));
  }

  throw new CalculationError(
    "MISSING_CHARGING_COST",
    "Ange kWh och pris per kWh, eller en manuell totalkostnad.",
  );
}

export function calculateMeterKwh(
  meterStart: DecimalInput,
  meterEnd: DecimalInput,
): Decimal {
  const start = assertNonNegative(meterStart, "Startmätaren kan inte vara negativ.");
  const end = assertNonNegative(meterEnd, "Slutmätaren kan inte vara negativ.");

  if (end.lessThan(start)) {
    throw new CalculationError(
      "NEGATIVE_METER",
      "Slutmätaren kan inte vara lägre än startmätaren.",
    );
  }

  return toDecimal(end.minus(start));
}
