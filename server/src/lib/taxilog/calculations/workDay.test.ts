import assert from "node:assert/strict";
import { test } from "node:test";
import { EXPECTED_WORK_DAY, TEST_WORK_DAY_INPUT } from "./testFixtures";
import { calculateWorkDay } from "./workDay";

test("test workday matches expected daily financial results without salary", () => {
  const workDay = calculateWorkDay(TEST_WORK_DAY_INPUT);

  assert.equal(workDay.totalIncome.toFixed(2), "3300.00");
  assert.equal(workDay.vatAmount.toFixed(2), "198.00");
  assert.equal(workDay.incomeExVat.toFixed(2), "3102.00");
  assert.equal(workDay.totalCosts.toFixed(2), "230.00");
  assert.equal(workDay.workHours.toString(), EXPECTED_WORK_DAY.workHours);
  assert.equal(workDay.totalKm.toString(), EXPECTED_WORK_DAY.totalKm);
  assert.equal(workDay.tips.toFixed(2), "150.00");
  assert.equal("calculatedSalary" in workDay, false);
  assert.equal("resultAfterSalary" in workDay, false);
});
