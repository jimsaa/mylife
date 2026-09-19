import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "../calculations/errors";
import { calculateAccruedSalary } from "../calculations/payroll";
import { calculateDailyFinancials, parseChargingKwh, parseWorkedHours } from "../data/dailyFinancials";
import { DEFAULT_SALARY_RATE, DEFAULT_VAT_RATE } from "../settings/defaults";
import { formatDailyExport, parseTaxiLogImport } from "./taxilogImport";

const SAMPLE = `TAXILOG_IMPORT
VERSION=1
DATE=2026-09-19

GROSS_INCOME=3300
TIPS=150
WORKED_HOURS=12.25
CHARGING_KWH=32.4

END_TAXILOG_IMPORT`;

test("parses the VERSION=1 daily import", () => {
  const parsed = parseTaxiLogImport(SAMPLE);
  assert.deepEqual(parsed, {
    date: "2026-09-19",
    grossIncome: "3300",
    tips: "150",
    workedHours: "12.25",
    chargingKwh: "32.4",
  });
});

test("round-trips export back to the same import values", () => {
  const parsed = parseTaxiLogImport(SAMPLE);
  assert.deepEqual(parseTaxiLogImport(formatDailyExport(parsed)), parsed);
});

test("import preview calculates 6% VAT and keeps tips separate", () => {
  const parsed = parseTaxiLogImport(SAMPLE);
  const financials = calculateDailyFinancials({
    grossIncome: parsed.grossIncome,
    tips: parsed.tips,
    vatRate: DEFAULT_VAT_RATE,
  });

  assert.equal(financials.totalIncome.toFixed(2), "3300.00");
  assert.equal(financials.vatAmount.toFixed(2), "198.00");
  assert.equal(financials.incomeExVat.toFixed(2), "3102.00");
  assert.equal(financials.tips.toFixed(2), "150.00");
  assert.equal(parseWorkedHours(parsed.workedHours).toString(), "12.25");
  assert.equal(parseChargingKwh(parsed.chargingKwh).toString(), "32.4");
});

test("tips are excluded from VAT and salary", () => {
  const parsed = parseTaxiLogImport(SAMPLE);
  const financials = calculateDailyFinancials({
    grossIncome: parsed.grossIncome,
    tips: parsed.tips,
    vatRate: DEFAULT_VAT_RATE,
  });
  const salary = calculateAccruedSalary(financials.incomeExVat, DEFAULT_SALARY_RATE);

  assert.equal(financials.vatAmount.toFixed(2), "198.00");
  assert.notEqual(financials.vatAmount.toFixed(2), "207.00");
  assert.equal(salary.toFixed(2), "1457.94");
  assert.notEqual(salary.toFixed(2), "1528.44");
});

test("re-importing the same date replaces the previous values", () => {
  const first = parseTaxiLogImport(SAMPLE);
  const second = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=1
DATE=2026-09-19

GROSS_INCOME=3500
TIPS=80
WORKED_HOURS=10
CHARGING_KWH=20

END_TAXILOG_IMPORT`);

  assert.equal(first.date, second.date);
  assert.equal(second.grossIncome, "3500");
  assert.equal(second.tips, "80");
  assert.equal(second.workedHours, "10");
  assert.equal(second.chargingKwh, "20");

  const updated = calculateDailyFinancials({
    grossIncome: second.grossIncome,
    tips: second.tips,
    vatRate: DEFAULT_VAT_RATE,
  });
  assert.equal(updated.vatAmount.toFixed(2), "210.00");
  assert.equal(updated.incomeExVat.toFixed(2), "3290.00");
  assert.equal(calculateAccruedSalary(updated.incomeExVat).toFixed(2), "1546.30");
});

test("rejects an invalid import block", () => {
  assert.throws(() => parseTaxiLogImport("GROSS_INCOME=3300"), CalculationError);
});
