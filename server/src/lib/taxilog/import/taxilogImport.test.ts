import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "../calculations/errors";
import { calculateAccruedSalary } from "../calculations/payroll";
import { calculateDailyFinancials, parseChargingKwh, parseWorkedHours } from "../data/dailyFinancials";
import { DEFAULT_SALARY_RATE, DEFAULT_VAT_RATE } from "../settings/defaults";
import { parseTaxiLogImport as vercelParse } from "../../../../../api/_lib/taxilog/import/taxilogImport.ts";
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
    version: "1",
    date: "2026-09-19",
    grossIncome: "3300",
    ownBookings: "0",
    otherIncome: "3300",
    handUp: null,
    uberIncome: null,
    boltIncome: null,
    tips: "150",
    bonus: "0",
    workedHours: "12.25",
    chargingKwh: "32.4",
    totalIncome: "3450",
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

test("parses VERSION=2 and rejects a split that does not match gross income", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1500
OWN_BOOKINGS=800
OTHER_INCOME=700
TIPS=100
BONUS=250
WORKED_HOURS=8
CHARGING_KWH=35.5
END_TAXILOG_IMPORT`);
  assert.equal(parsed.version, "2");
  assert.equal(parsed.grossIncome, "1500");
  assert.equal(parsed.ownBookings, "800");
  assert.equal(parsed.otherIncome, "700");
  assert.equal(parsed.handUp, null);
  assert.equal(parsed.uberIncome, null);
  assert.equal(parsed.boltIncome, null);
  assert.equal(parsed.tips, "100");
  assert.equal(parsed.bonus, "250");
  assert.equal(parsed.totalIncome, "1850");

  assert.throws(
    () =>
      parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=2
DATE=2026-11-02
GROSS_INCOME=1500
OWN_BOOKINGS=800
OTHER_INCOME=900
TIPS=0
BONUS=0
WORKED_HOURS=8
CHARGING_KWH=0
END_TAXILOG_IMPORT`),
    CalculationError,
  );
});

const V3_SAMPLE = `TAXILOG_IMPORT
VERSION=3
DATE=2026-11-03

OWN_BOOKINGS=1000
HAND_UP=500
UBER_INCOME=1200
BOLT_INCOME=800

BONUS=200
TIPS=100

WORKED_HOURS=8.5

END_TAXILOG_IMPORT`;

test("parses a complete VERSION=3 import and computes gross and total income", () => {
  const parsed = parseTaxiLogImport(V3_SAMPLE);
  assert.equal(parsed.version, "3");
  assert.equal(parsed.date, "2026-11-03");
  assert.equal(parsed.ownBookings, "1000");
  assert.equal(parsed.handUp, "500");
  assert.equal(parsed.uberIncome, "1200");
  assert.equal(parsed.boltIncome, "800");
  assert.equal(parsed.bonus, "200");
  assert.equal(parsed.tips, "100");
  assert.equal(parsed.workedHours, "8.5");
  assert.equal(parsed.grossIncome, "3500");
  assert.equal(parsed.totalIncome, "3800");
  assert.equal(parsed.otherIncome, null);
  assert.equal(parsed.chargingKwh, undefined);
});

test("VERSION=3 keeps each income source separate and accepts explicit zeros", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=3
DATE=2026-11-03
OWN_BOOKINGS=0
HAND_UP=0
UBER_INCOME=0
BOLT_INCOME=0
BONUS=0
TIPS=0
WORKED_HOURS=0
END_TAXILOG_IMPORT`);
  assert.equal(parsed.ownBookings, "0");
  assert.equal(parsed.handUp, "0");
  assert.equal(parsed.uberIncome, "0");
  assert.equal(parsed.boltIncome, "0");
  assert.equal(parsed.bonus, "0");
  assert.equal(parsed.tips, "0");
  assert.equal(parsed.grossIncome, "0");
  assert.equal(parsed.totalIncome, "0");
});

test("VERSION=3 accepts decimals", () => {
  const parsed = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=3
DATE=2026-11-03
OWN_BOOKINGS=1000,25
HAND_UP=500.50
UBER_INCOME=1200
BOLT_INCOME=800
BONUS=200,10
TIPS=100
WORKED_HOURS=8,25
END_TAXILOG_IMPORT`);
  assert.equal(parsed.ownBookings, "1000.25");
  assert.equal(parsed.handUp, "500.5");
  assert.equal(parsed.bonus, "200.1");
  assert.equal(parsed.workedHours, "8.25");
  assert.equal(parsed.grossIncome, "3500.75");
});

test("VERSION=3 rejects missing, empty, negative, invalid and bad dates", () => {
  const base = `TAXILOG_IMPORT
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

  assert.throws(() => parseTaxiLogImport(base.replace("HAND_UP=500\n", "")), (error: unknown) => {
    assert.equal((error as CalculationError).code, "MISSING_FIELD");
    return true;
  });
  assert.throws(() => parseTaxiLogImport(base.replace("BONUS=200", "BONUS=")), (error: unknown) => {
    assert.equal((error as CalculationError).code, "EMPTY_FIELD");
    return true;
  });
  assert.throws(() => parseTaxiLogImport(base.replace("TIPS=100", "TIPS=-1")), (error: unknown) => {
    assert.equal((error as CalculationError).code, "NEGATIVE_VALUE");
    return true;
  });
  assert.throws(() => parseTaxiLogImport(base.replace("UBER_INCOME=1200", "UBER_INCOME=abc")), (error: unknown) => {
    assert.equal((error as CalculationError).code, "INVALID_NUMBER");
    return true;
  });
  assert.throws(() => parseTaxiLogImport(base.replace("DATE=2026-11-03", "DATE=2026-13-03")), (error: unknown) => {
    assert.equal((error as CalculationError).code, "INVALID_DATE");
    return true;
  });
  assert.throws(() => parseTaxiLogImport(base.replace("WORKED_HOURS=8", "WORKED_HOURS=-2")), CalculationError);
});

test("VERSION=3 export round-trips without charging or manual gross", () => {
  const parsed = parseTaxiLogImport(V3_SAMPLE);
  const exported = formatDailyExport(parsed);
  assert.match(exported, /^TAXILOG_IMPORT\nVERSION=3\n/);
  assert.doesNotMatch(exported, /GROSS_INCOME=/);
  assert.doesNotMatch(exported, /CHARGING_KWH=/);
  assert.deepEqual(parseTaxiLogImport(exported), parsed);
});

test("Express and Vercel parse VERSION=3 identically", () => {
  const local = parseTaxiLogImport(V3_SAMPLE);
  const vercel = vercelParse(V3_SAMPLE);
  assert.deepEqual(vercel, local);
});
