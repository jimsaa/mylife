import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTaxiLogImport } from "./import/taxilogImport";
import {
  emptyTaxiLogState,
  loadMonthOverviewFromState,
  saveDailyLogToState,
  seedRealTaxiLogData,
  settleMonthInState,
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
  assert.equal(month.ownBookings, null);
  assert.equal(month.bonus, null);
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

test("TEST 1 salary uses gross income only, not tips bonus or own bookings extra", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1000
OWN_BOOKINGS=200
OTHER_INCOME=800
TIPS=50
BONUS=100
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const month = loadMonthOverviewFromState(saveDailyLogToState(emptyTaxiLogState(), parsed), 2026, 11);

  assert.equal(month.grossIncome, "1000");
  assert.equal(month.ownBookings, "200");
  assert.equal(month.otherIncome, "800");
  assert.equal(Number(month.netIncome).toFixed(2), "940.00");
  assert.equal(Number(month.accruedSalary).toFixed(2), "441.80");
  assert.equal(month.tips, "50");
  assert.equal(month.bonus, "100");
  assert.equal(month.savings.monthTotal, "150.00");
});

test("TEST 2 private net 13000 and surplus 4000 after settlement", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-12-01
GROSS_INCOME=38478.95
OWN_BOOKINGS=0
OTHER_INCOME=38478.95
TIPS=0
BONUS=0
WORKED_HOURS=1
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const before = loadMonthOverviewFromState(saveDailyLogToState(emptyTaxiLogState(), parsed), 2026, 12);
  assert.equal(Number(before.accruedSalary).toFixed(2), "17000.00");
  assert.equal(before.projectedPrivateNet, "13000.00");
  assert.equal(before.projectedSurplus, "4000.00");
  assert.equal(before.salaryPaid, "0");
  assert.equal(before.savings.fromSalarySurplus, "0.00");

  const settled = loadMonthOverviewFromState(
    settleMonthInState(saveDailyLogToState(emptyTaxiLogState(), parsed), 2026, 12, "2026-12-31"),
    2026,
    12,
  );
  assert.equal(settled.privateNetTaken, "13000.00");
  assert.equal(settled.savings.fromSalarySurplus, "4000.00");
  assert.equal(settled.settlementLocked, true);
});

test("TEST 3 tips and bonus go to savings and stay out of salary", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-03
GROSS_INCOME=1000
OWN_BOOKINGS=0
OTHER_INCOME=1000
TIPS=50
BONUS=200
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const month = loadMonthOverviewFromState(saveDailyLogToState(emptyTaxiLogState(), parsed), 2026, 11);
  assert.equal(Number(month.accruedSalary).toFixed(2), "441.80");
  assert.equal(month.savings.fromTips, "50.00");
  assert.equal(month.savings.fromBonus, "200.00");
  assert.equal(month.savings.total, "250.00");
});

test("TEST 4 savings survive into the next month", () => {
  const first = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1000
OWN_BOOKINGS=0
OTHER_INCOME=1000
TIPS=50
BONUS=200
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const state = saveDailyLogToState(emptyTaxiLogState(), first);
  const november = loadMonthOverviewFromState(state, 2026, 11);
  const december = loadMonthOverviewFromState(state, 2026, 12);
  assert.equal(november.savings.total, "250.00");
  assert.equal(december.savings.total, "250.00");
  assert.equal(december.savings.monthTotal, "0.00");
});

test("TEST 5 duplicate import does not double income or savings", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1000
OWN_BOOKINGS=200
OTHER_INCOME=800
TIPS=50
BONUS=100
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const once = saveDailyLogToState(emptyTaxiLogState(), parsed);
  const twice = saveDailyLogToState(once, parsed);
  const month = loadMonthOverviewFromState(twice, 2026, 11);
  assert.equal(twice.workDays.length, 1);
  assert.equal(month.grossIncome, "1000");
  assert.equal(month.savings.total, "150.00");
  assert.equal(twice.savingsLedger.filter((entry) => entry.kind === "TIPS").length, 1);
});

test("TEST 6 VERSION=1 import still works", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=1
DATE=2026-09-19
GROSS_INCOME=1214
TIPS=0
WORKED_HOURS=9
CHARGING_KWH=16.3
END_TAXILOG_IMPORT`);
  const month = loadMonthOverviewFromState(saveDailyLogToState(emptyTaxiLogState(), parsed), 2026, 9);
  assert.equal(month.grossIncome, "1214");
  assert.equal(Number(month.netIncome).toFixed(2), "1141.16");
  assert.equal(parsed.ownBookings, "0");
  assert.equal(parsed.bonus, "0");
});
