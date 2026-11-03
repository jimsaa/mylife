import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTaxiLogImport as vercelParse } from "../../../../api/_lib/taxilog/import/taxilogImport.ts";
import {
  loadDailyLogFromState as vercelLoadDaily,
  saveDailyLogToState as vercelSaveDaily,
} from "../../../../api/_lib/taxilog/service.ts";
import { parseTaxiLogImport } from "./import/taxilogImport";
import Decimal from "decimal.js";
import {
  emptyTaxiLogState,
  loadDailyLogFromState,
  loadMonthOverviewFromState,
  normalizeTaxiLogState,
  previewImport,
  saveDailyLogToState,
  seedRealTaxiLogData,
  settleMonthInState,
  unlockMonthInState,
  type TaxiLogState,
} from "./service";

function stateWithAccruedSalary(accrued: string, extras?: { tips?: string; bonus?: string }): TaxiLogState {
  const incomeExVat = new Decimal(accrued).div("0.47").toFixed(2);
  const state = emptyTaxiLogState();
  return {
    ...state,
    workDays: [
      {
        date: "2026-12-15",
        workHours: "1",
        totalIncome: incomeExVat,
        ownBookings: "0",
        otherIncome: incomeExVat,
        handUp: null,
        uberIncome: null,
        boltIncome: null,
        tips: extras?.tips ?? "0",
        bonus: extras?.bonus ?? "0",
        vatRate: "6",
        vatAmount: "0",
        incomeExVat,
        totalCosts: "0",
        totalKm: "0",
        numberOfTrips: 0,
      },
    ],
  };
}

const SEPTEMBER_2026_FREEZE = {
  grossIncome: "3449",
  incomeAfterVat: "3242.06",
  accruedSalary: "1523.77",
  ownBookings: null,
  bonus: null,
} as const;

function historicalSeptemberDayFreeze(state: TaxiLogState) {
  return state.workDays
    .filter((day) => day.date.startsWith("2026-09-"))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((day) => ({
      date: day.date,
      totalIncome: day.totalIncome,
      vatAmount: day.vatAmount,
      incomeExVat: day.incomeExVat,
      ownBookings: day.ownBookings ?? null,
      bonus: day.bonus ?? null,
    }));
}

function historicalSeptemberMonthFreeze(state: TaxiLogState) {
  const month = loadMonthOverviewFromState(state, 2026, 9);
  return {
    grossIncome: month.grossIncome,
    incomeAfterVat: Number(month.netIncome).toFixed(2),
    accruedSalary: Number(month.accruedSalary).toFixed(2),
    ownBookings: month.ownBookings,
    bonus: month.bonus,
  };
}

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
  assert.equal(month.handUp, null);
  assert.equal(month.uberIncome, null);
  assert.equal(month.boltIncome, null);
  assert.equal(month.uncategorizedGross, "3449.00");
});

test("historical September 2026 freeze is unchanged by state normalization", () => {
  const seeded = seedRealTaxiLogData(emptyTaxiLogState());
  const beforeDays = historicalSeptemberDayFreeze(seeded);
  const beforeMonth = historicalSeptemberMonthFreeze(seeded);

  assert.equal(beforeMonth.grossIncome, SEPTEMBER_2026_FREEZE.grossIncome);
  assert.equal(beforeMonth.incomeAfterVat, SEPTEMBER_2026_FREEZE.incomeAfterVat);
  assert.equal(beforeMonth.accruedSalary, SEPTEMBER_2026_FREEZE.accruedSalary);
  assert.equal(beforeMonth.ownBookings, SEPTEMBER_2026_FREEZE.ownBookings);
  assert.equal(beforeMonth.bonus, SEPTEMBER_2026_FREEZE.bonus);
  assert.equal(beforeDays.length, 2);
  for (const day of beforeDays) {
    assert.equal(day.ownBookings, null);
    assert.equal(day.bonus, null);
    assert.equal(seeded.workDays.find((row) => row.date === day.date)?.handUp ?? null, null);
    assert.equal(seeded.workDays.find((row) => row.date === day.date)?.uberIncome ?? null, null);
    assert.equal(seeded.workDays.find((row) => row.date === day.date)?.boltIncome ?? null, null);
  }

  const after = normalizeTaxiLogState(seeded);
  assert.deepEqual(historicalSeptemberDayFreeze(after), beforeDays);
  assert.deepEqual(historicalSeptemberMonthFreeze(after), beforeMonth);

  const legacyShaped: TaxiLogState = {
    ...seeded,
    workDays: seeded.workDays.map((day) => {
      const { ownBookings: _own, otherIncome: _other, bonus: _bonus, ...rest } = day;
      return rest as typeof day;
    }),
  };
  const afterLegacy = normalizeTaxiLogState(legacyShaped);
  assert.deepEqual(historicalSeptemberDayFreeze(afterLegacy), beforeDays);
  assert.deepEqual(historicalSeptemberMonthFreeze(afterLegacy), beforeMonth);
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

test("TEST 2 private gross 15500 net 13181 and surplus after settlement", () => {
  const seeded = stateWithAccruedSalary("17000");
  const before = loadMonthOverviewFromState(seeded, 2026, 12);
  assert.equal(Number(before.accruedSalary).toFixed(2), "17000.00");
  assert.equal(before.privateGrossAllocation, "15500.00");
  assert.equal(before.preliminaryTax, "2319.00");
  assert.equal(before.projectedPrivateNet, "13181.00");
  assert.equal(before.projectedSurplus, "1500.00");
  assert.equal(before.salaryPaid, "0");
  assert.equal(before.savings.fromSalarySurplus, "0.00");

  const settled = loadMonthOverviewFromState(settleMonthInState(seeded, 2026, 12, "2026-12-31"), 2026, 12);
  assert.equal(settled.privateNetTaken, "13181.00");
  assert.equal(settled.savings.fromSalarySurplus, "1500.00");
  assert.equal(settled.salaryRemaining, "0");
  assert.equal(settled.settlementLocked, true);
});

test("B: 20000 accrued saves 4500 surplus without double counting", () => {
  const settled = loadMonthOverviewFromState(
    settleMonthInState(stateWithAccruedSalary("20000"), 2026, 12, "2026-12-31"),
    2026,
    12,
  );
  assert.equal(settled.privateGrossAllocation, "15500.00");
  assert.equal(settled.preliminaryTax, "2319.00");
  assert.equal(settled.projectedPrivateNet, "13181.00");
  assert.equal(settled.savings.fromSalarySurplus, "4500.00");
  assert.equal(settled.salaryRemaining, "0");
  assert.notEqual(settled.salaryRemaining, settled.savings.fromSalarySurplus);
});

test("unlock reverses private allocation and surplus without touching tips", () => {
  const started = saveDailyLogToState(stateWithAccruedSalary("20000"), {
    date: "2026-11-02",
    grossIncome: "1000",
    tips: "50",
    bonus: "100",
    workedHours: "1",
    chargingKwh: "0",
    ownBookings: "0",
    otherIncome: "1000",
  });
  const settled = settleMonthInState(started, 2026, 12, "2026-12-31");
  const unlocked = loadMonthOverviewFromState(unlockMonthInState(settled, 2026, 12), 2026, 12);
  const november = loadMonthOverviewFromState(unlockMonthInState(settled, 2026, 12), 2026, 11);
  assert.equal(unlocked.settlementLocked, false);
  assert.equal(unlocked.privateNetTaken, "0.00");
  assert.equal(unlocked.savings.fromSalarySurplus, "0.00");
  assert.equal(november.savings.fromTips, "50.00");
  assert.equal(november.savings.fromBonus, "100.00");
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

test("November income is assigned to 25 December payment", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1000
OWN_BOOKINGS=0
OTHER_INCOME=1000
TIPS=50
BONUS=100
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const november = loadMonthOverviewFromState(saveDailyLogToState(emptyTaxiLogState(), parsed), 2026, 11);
  assert.equal(november.expectedPaymentDate, "2026-12-25");
  assert.equal(Number(november.accruedSalary).toFixed(2), "441.80");
  assert.equal(november.tips, "50");
});

test("December income is assigned to 25 January payment", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-12-02
GROSS_INCOME=2000
OWN_BOOKINGS=0
OTHER_INCOME=2000
TIPS=0
BONUS=0
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const december = loadMonthOverviewFromState(saveDailyLogToState(emptyTaxiLogState(), parsed), 2026, 12);
  assert.equal(december.expectedPaymentDate, "2027-01-25");
});

test("current month progress is separate from next payment", () => {
  const november = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1000
OWN_BOOKINGS=0
OTHER_INCOME=1000
TIPS=50
BONUS=100
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const december = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-12-02
GROSS_INCOME=2000
OWN_BOOKINGS=0
OTHER_INCOME=2000
TIPS=0
BONUS=0
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const state = saveDailyLogToState(saveDailyLogToState(emptyTaxiLogState(), november), december);
  const current = loadMonthOverviewFromState(state, 2026, 12);
  const prior = loadMonthOverviewFromState(state, 2026, 11);

  assert.equal(current.grossIncome, "2000");
  assert.equal(current.expectedPaymentDate, "2027-01-25");
  assert.equal(current.nextPayment?.earningMonth, 11);
  assert.equal(current.nextPayment?.paymentDate, "2026-12-25");
  assert.equal(current.nextPayment?.accruedSalary, prior.accruedSalary);
  assert.notEqual(current.accruedSalary, current.nextPayment?.accruedSalary);
  assert.equal(current.settlementLocked, false);
  assert.equal(current.nextPayment?.settlementLocked, false);
});

test("previous month settlement is not overwritten by current month activity", () => {
  const november = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1000
OWN_BOOKINGS=0
OTHER_INCOME=1000
TIPS=50
BONUS=100
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const settledNovember = settleMonthInState(saveDailyLogToState(emptyTaxiLogState(), november), 2026, 11, "2026-11-30");
  const december = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-12-02
GROSS_INCOME=2000
OWN_BOOKINGS=0
OTHER_INCOME=2000
TIPS=0
BONUS=0
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`);
  const afterDecember = saveDailyLogToState(settledNovember, december);
  const novemberAfter = loadMonthOverviewFromState(afterDecember, 2026, 11);
  const decemberView = loadMonthOverviewFromState(afterDecember, 2026, 12);

  assert.equal(novemberAfter.settlementLocked, true);
  assert.equal(novemberAfter.grossIncome, "1000");
  assert.equal(novemberAfter.privateNetTaken, loadMonthOverviewFromState(settledNovember, 2026, 11).privateNetTaken);
  assert.equal(decemberView.settlementLocked, false);
  assert.equal(decemberView.nextPayment?.settlementLocked, true);
  assert.equal(decemberView.nextPayment?.accruedSalary, novemberAfter.accruedSalary);
  assert.equal(
    afterDecember.payments.find((payment) => payment.notes === "PRIVATE_GROSS:2026-11")?.paymentDate,
    "2026-12-25",
  );
});

const V3_DAY = `TAXILOG_IMPORT
VERSION=3
DATE=2026-11-03
OWN_BOOKINGS=1000
HAND_UP=500
UBER_INCOME=1200
BOLT_INCOME=800
BONUS=200
TIPS=100
WORKED_HOURS=8
END_TAXILOG_IMPORT`;

test("VERSION=3 save round-trips all six sources and keeps tips and bonus out of salary", () => {
  const parsed = parseTaxiLogImport(V3_DAY);
  const preview = previewImport(emptyTaxiLogState(), parsed);
  assert.equal(preview.preview.grossIncome, "3500");
  assert.equal(preview.preview.totalIncome, "3800.00");
  assert.equal(preview.preview.ownBookings, "1000");
  assert.equal(preview.preview.handUp, "500");
  assert.equal(preview.preview.uberIncome, "1200");
  assert.equal(preview.preview.boltIncome, "800");
  assert.equal(preview.preview.bonus, "200.00");
  assert.equal(preview.preview.tips, "100.00");
  assert.equal(preview.preview.estimatedSalary, "1546.30");

  const state = saveDailyLogToState(emptyTaxiLogState(), parsed);
  const loaded = loadDailyLogFromState(state, "2026-11-03");
  const month = loadMonthOverviewFromState(state, 2026, 11);

  assert.equal(loaded?.ownBookings, "1000");
  assert.equal(loaded?.handUp, "500");
  assert.equal(loaded?.uberIncome, "1200");
  assert.equal(loaded?.boltIncome, "800");
  assert.equal(loaded?.bonus, "200.00");
  assert.equal(loaded?.tips, "100.00");
  assert.equal(loaded?.grossIncome, "3500.00");
  assert.equal(loaded?.totalIncome, "3800.00");
  assert.equal(loaded?.sourceCategorized, true);
  assert.equal(month.grossIncome, "3500");
  assert.equal(month.totalIncome, "3800.00");
  assert.equal(month.handUp, "500");
  assert.equal(month.uberIncome, "1200");
  assert.equal(month.boltIncome, "800");
  assert.equal(Number(month.netIncome).toFixed(2), "3290.00");
  assert.equal(Number(month.accruedSalary).toFixed(2), "1546.30");
  assert.equal(month.savings.fromTips, "100.00");
  assert.equal(month.savings.fromBonus, "200.00");
  assert.equal(month.uncategorizedGross, "0.00");
  assert.equal(month.sourceShares.ownBookings, "28.6");
});

test("VERSION=3 duplicate import updates the same day and savings keys", () => {
  const first = parseTaxiLogImport(V3_DAY);
  const second = parseTaxiLogImport(V3_DAY.replace("BONUS=200", "BONUS=50").replace("TIPS=100", "TIPS=25"));
  const once = saveDailyLogToState(emptyTaxiLogState(), first);
  const twice = saveDailyLogToState(once, second);
  const month = loadMonthOverviewFromState(twice, 2026, 11);
  assert.equal(twice.workDays.length, 1);
  assert.equal(month.grossIncome, "3500");
  assert.equal(month.savings.fromBonus, "50.00");
  assert.equal(month.savings.fromTips, "25.00");
  assert.equal(twice.savingsLedger.filter((entry) => entry.kind === "BONUS").length, 1);
  assert.equal(twice.savingsLedger.filter((entry) => entry.kind === "TIPS").length, 1);
});

test("VERSION=3 import preserves historical charging and does not recategorize September", () => {
  const seeded = seedRealTaxiLogData(emptyTaxiLogState());
  const imported = saveDailyLogToState(seeded, parseTaxiLogImport(V3_DAY));
  const september = loadMonthOverviewFromState(imported, 2026, 9);
  const november = loadMonthOverviewFromState(imported, 2026, 11);
  assert.equal(september.grossIncome, "3449");
  assert.equal(september.handUp, null);
  assert.equal(september.uncategorizedGross, "3449.00");
  assert.equal(september.chargingKwh, "16.3");
  assert.equal(november.handUp, "500");
  assert.equal(november.chargingKwh, "0");
});

test("VERSION=3 does not overwrite an existing charging value for the same date", () => {
  const withCharge = saveDailyLogToState(emptyTaxiLogState(), parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=1
DATE=2026-11-03
GROSS_INCOME=100
TIPS=0
WORKED_HOURS=1
CHARGING_KWH=22.5
END_TAXILOG_IMPORT`));
  const updated = saveDailyLogToState(withCharge, parseTaxiLogImport(V3_DAY));
  const loaded = loadDailyLogFromState(updated, "2026-11-03");
  assert.equal(loaded?.chargingKwh, "22.5");
  assert.equal(loaded?.grossIncome, "3500.00");
  assert.equal(loaded?.handUp, "500");
});

test("Express and Vercel save VERSION=3 sources identically", () => {
  const parsed = parseTaxiLogImport(V3_DAY);
  assert.deepEqual(vercelParse(V3_DAY), parsed);
  const local = loadDailyLogFromState(saveDailyLogToState(emptyTaxiLogState(), parsed), "2026-11-03");
  const vercel = vercelLoadDaily(vercelSaveDaily(emptyTaxiLogState(), parsed), "2026-11-03");
  assert.deepEqual(vercel, local);
});
