import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "./errors";
import { calculateTotalCosts, calculateTotalIncome, validateTips } from "./income";

test("total income sums payment methods and excludes tips", () => {
  assert.equal(
    calculateTotalIncome({
      cashIncome: "500",
      cardIncome: "2500",
      swishIncome: "300",
      otherIncome: "0",
    }).toFixed(2),
    "3300.00",
  );
});

test("total costs sum energy and other costs", () => {
  assert.equal(
    calculateTotalCosts({ energyCost: "180", otherCosts: "50" }).toFixed(2),
    "230.00",
  );
});

test("negative income, tips and costs are rejected", () => {
  assert.throws(
    () =>
      calculateTotalIncome({
        cashIncome: "-1",
        cardIncome: "0",
        swishIncome: "0",
        otherIncome: "0",
      }),
    CalculationError,
  );
  assert.throws(() => validateTips("-1"), CalculationError);
  assert.throws(
    () => calculateTotalCosts({ energyCost: "-1", otherCosts: "0" }),
    CalculationError,
  );
});
