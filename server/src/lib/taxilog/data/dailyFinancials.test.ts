import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateDailyFinancials, parseChargingKwh, parseWorkedHours } from "./dailyFinancials";

test("daily financials use the VAT module for 3300", () => {
  const result = calculateDailyFinancials({
    grossIncome: "3300",
    tips: "150",
    vatRate: "6",
  });

  assert.equal(result.totalIncome.toFixed(2), "3300.00");
  assert.equal(result.vatAmount.toFixed(2), "198.00");
  assert.equal(result.incomeExVat.toFixed(2), "3102.00");
  assert.equal(result.tips.toFixed(2), "150.00");
});

test("editing gross income recalculates VAT and net", () => {
  const result = calculateDailyFinancials({
    grossIncome: "3500",
    tips: "150",
    vatRate: "6",
  });

  assert.equal(result.vatAmount.toFixed(2), "210.00");
  assert.equal(result.incomeExVat.toFixed(2), "3290.00");
});

test("worked hours are stored as a measurement, not a salary input", () => {
  assert.equal(parseWorkedHours("12.25").toString(), "12.25");
  assert.equal(parseWorkedHours("").toString(), "0");
});

test("charging is stored as kWh energy", () => {
  assert.equal(parseChargingKwh("32.4").toString(), "32.4");
});
