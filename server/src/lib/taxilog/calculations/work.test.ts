import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "./errors";
import {
  calculateTotalKm,
  calculateWorkHours,
  formatWorkHours,
  validateTripCount,
} from "./work";

test("work hours are calculated from start and end time", () => {
  assert.equal(calculateWorkHours("06:30", "18:45").toString(), "12.25");
});

test("work hours are formatted as hours and minutes", () => {
  assert.equal(formatWorkHours("12.25"), "12h 15m");
});

test("invalid time range is rejected", () => {
  assert.throws(() => calculateWorkHours("18:45", "06:30"), (error: unknown) => {
    return error instanceof CalculationError && error.messageSv === "Sluttiden måste vara efter starttiden.";
  });
});

test("distance is end odometer minus start odometer", () => {
  assert.equal(calculateTotalKm("12000", "12284").toString(), "284");
});

test("negative distance is rejected", () => {
  assert.throws(() => calculateTotalKm("12284", "12000"), (error: unknown) => {
    return error instanceof CalculationError && error.messageSv === "Slutmätaren kan inte vara lägre än startmätaren.";
  });
});

test("trip count must be a non-negative integer", () => {
  assert.equal(validateTripCount(18), 18);
  assert.equal(validateTripCount(0), 0);
  assert.throws(() => validateTripCount(-1), CalculationError);
  assert.throws(() => validateTripCount("1.5"), CalculationError);
});
