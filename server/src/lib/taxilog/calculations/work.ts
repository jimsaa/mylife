import Decimal from "decimal.js";
import { CalculationError } from "./errors";
import { assertNonNegative, type DecimalInput } from "./money";

const TIME_PATTERN = /^(\d{1,2}):([0-5]\d)$/;

export function parseTimeToMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time.trim());
  if (!match) {
    throw new CalculationError(
      "INVALID_TIME",
      "Ogiltig tid. Använd formatet TT:MM.",
    );
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23) {
    throw new CalculationError(
      "INVALID_TIME",
      "Ogiltig tid. Använd formatet TT:MM.",
    );
  }

  return hours * 60 + minutes;
}

export function calculateWorkHours(startTime: string, endTime: string): Decimal {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (endMinutes <= startMinutes) {
    throw new CalculationError(
      "INVALID_TIME_RANGE",
      "Sluttiden måste vara efter starttiden.",
    );
  }

  return new Decimal(endMinutes - startMinutes).dividedBy(60);
}

export function formatWorkHours(workHours: DecimalInput): string {
  const hours = assertNonNegative(workHours, "Arbetstiden kan inte vara negativ.");
  const totalMinutes = hours.times(60).toDecimalPlaces(0, Decimal.ROUND_HALF_UP);
  const wholeHours = totalMinutes.dividedToIntegerBy(60);
  const minutes = totalMinutes.mod(60);

  return `${wholeHours.toFixed(0)}h ${minutes.toFixed(0).padStart(2, "0")}m`;
}

export function calculateTotalKm(
  startOdometer: DecimalInput,
  endOdometer: DecimalInput,
): Decimal {
  const start = assertNonNegative(startOdometer, "Startmätaren kan inte vara negativ.");
  const end = assertNonNegative(endOdometer, "Slutmätaren kan inte vara negativ.");

  if (end.lessThan(start)) {
    throw new CalculationError(
      "NEGATIVE_DISTANCE",
      "Slutmätaren kan inte vara lägre än startmätaren.",
    );
  }

  return end.minus(start);
}

export function validateTripCount(numberOfTrips: DecimalInput): number {
  const trips = assertNonNegative(
    numberOfTrips,
    "Antal körningar kan inte vara negativt.",
  );
  if (!trips.isInteger()) {
    throw new CalculationError(
      "INVALID_TRIPS",
      "Antal körningar måste vara ett heltal.",
    );
  }
  return trips.toNumber();
}
