import assert from "node:assert/strict";
import { test } from "node:test";
import { aggregateWorkDaysForPayroll, buildMonthlyPayrollState } from "../calculations/payroll";
import {
  TEST_SEPTEMBER_BALANCING_DAY,
  TEST_WORK_DAY_INPUT,
} from "../calculations/testFixtures";
import { calculateWorkDay } from "../calculations/workDay";
import { formatDailyExport } from "../import/taxilogImport";
import { formatMonthlyExport } from "./taxilogMonthly";

test("daily export uses the stable VERSION=1 import format", () => {
  const exportText = formatDailyExport({
    date: "2026-09-19",
    grossIncome: "3300",
    tips: "150",
    workedHours: "12.25",
    chargingKwh: "32.4",
  });

  assert.equal(
    exportText,
    [
      "TAXILOG_IMPORT",
      "VERSION=1",
      "DATE=2026-09-19",
      "",
      "GROSS_INCOME=3300",
      "TIPS=150",
      "WORKED_HOURS=12.25",
      "CHARGING_KWH=32.4",
      "",
      "END_TAXILOG_IMPORT",
    ].join("\n"),
  );
  assert.doesNotMatch(exportText, /SALARY/);
  assert.doesNotMatch(exportText, /VAT_AMOUNT/);
});

test("monthly export keeps accrued salary separate from payments", () => {
  const state = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(2026, 9, [
      calculateWorkDay(TEST_SEPTEMBER_BALANCING_DAY),
      calculateWorkDay(TEST_WORK_DAY_INPUT),
    ]),
    payments: [{ paymentDate: "2026-10-10", amount: "15000" }],
    asOfDate: "2026-10-10",
  });
  const exportText = formatMonthlyExport(state);

  assert.match(exportText, /^TAXILOG_MONTHLY_IMPORT\nVERSION=1\n/);
  assert.match(exportText, /YEAR=2026\nMONTH=9\n/);
  assert.match(exportText, /TOTAL_INCOME=60000/);
  assert.match(exportText, /TOTAL_TIPS=2300/);
  assert.match(exportText, /ACCRUED_SALARY=26508/);
  assert.match(exportText, /TOTAL_PAID=15000/);
  assert.match(exportText, /REMAINING_SALARY=11508/);
  assert.match(exportText, /SALARY_STATUS=PARTIALLY_PAID/);
  assert.match(exportText, /END_TAXILOG_MONTHLY_IMPORT$/);
});
