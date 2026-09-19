import assert from "node:assert/strict";
import { test } from "node:test";
import Decimal from "decimal.js";
import { calculatePerUnit, calculateWorkDayMetrics } from "./metrics";

test("per-unit metrics keep full precision", () => {
  const incomePerHour = calculatePerUnit("3300", "12.25");
  assert.ok(incomePerHour);
  assert.ok(incomePerHour.equals(new Decimal("3300").dividedBy("12.25")));
});

test("division by zero returns null", () => {
  assert.equal(calculatePerUnit("3300", "0"), null);
});

test("workday metrics keep income, tips and costs separate", () => {
  const metrics = calculateWorkDayMetrics({
    totalIncome: "3300",
    tips: "150",
    totalCosts: "230",
    workHours: "12.25",
    totalKm: "284",
    numberOfTrips: 18,
  });

  assert.equal("salaryPerHour" in metrics, false);
  assert.equal("resultPerHour" in metrics, false);
  assert.ok(metrics.tipsPerTrip);
  assert.ok(metrics.tipsPerTrip.equals(new Decimal("150").dividedBy(18)));
});
