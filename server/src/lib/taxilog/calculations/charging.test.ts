import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "./errors";
import { calculateChargingCost, resolveChargingCost } from "./charging";
import { EXPECTED_CHARGING } from "./testFixtures";

test("charging cost is kWh times price per kWh", () => {
  assert.equal(
    calculateChargingCost(EXPECTED_CHARGING.kwh, EXPECTED_CHARGING.pricePerKwh).toFixed(2),
    EXPECTED_CHARGING.totalCost,
  );
});

test("manual total cost is used when price is missing", () => {
  assert.equal(
    resolveChargingCost({ kwh: "32.4", manualTotalCost: "59.94" }).toFixed(2),
    "59.94",
  );
});

test("negative kWh is rejected", () => {
  assert.throws(() => calculateChargingCost("-1", "1.85"), CalculationError);
});
