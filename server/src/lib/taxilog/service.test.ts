import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTaxiLogImport } from "./import/taxilogImport";
import {
  emptyTaxiLogState,
  loadMonthOverviewFromState,
  saveDailyLogToState,
  seedRealTaxiLogData,
} from "./service";

test("seeded September 2026 matches the live TaxiLog totals", () => {
  const state = seedRealTaxiLogData(emptyTaxiLogState());
  const month = loadMonthOverviewFromState(state, 2026, 9);

  assert.equal(month.grossIncome, "3449");
  assert.equal(Number(month.netIncome).toFixed(2), "3242.06");
  assert.equal(Number(month.accruedSalary).toFixed(2), "1523.77");
  assert.equal(month.workedHours, "17");
  assert.equal(month.chargingKwh, "16.3");
  assert.equal(month.tips, "0");
});

test("re-importing the same date updates the unique day instead of duplicating", () => {
  const first = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=1
DATE=2026-09-19
GROSS_INCOME=1214
TIPS=0
WORKED_HOURS=9
CHARGING_KWH=16.3
END_TAXILOG_IMPORT`);
  const second = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=1
DATE=2026-09-19
GROSS_INCOME=1500
TIPS=0
WORKED_HOURS=9
CHARGING_KWH=10
END_TAXILOG_IMPORT`);

  const afterFirst = saveDailyLogToState(emptyTaxiLogState(), first);
  const afterSecond = saveDailyLogToState(afterFirst, second);
  const month = loadMonthOverviewFromState(afterSecond, 2026, 9);

  assert.equal(afterSecond.workDays.length, 1);
  assert.equal(afterSecond.workDays[0]?.totalIncome, "1500.00");
  assert.equal(month.chargingKwh, "10");
});
