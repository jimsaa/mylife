import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "./errors";
import {
  aggregateWorkDaysForPayroll,
  applySalaryPayment,
  buildMonthlyPayrollState,
  calculateAccruedSalary,
  calculateRemainingSalary,
  calculateTotalPaid,
  formatMonthlySummarySv,
  resolveSalaryStatus,
} from "./payroll";
import {
  EXPECTED_AUGUST_PAYROLL,
  EXPECTED_DAILY_SALARY,
  EXPECTED_SEPTEMBER_PAYROLL,
  TEST_AS_OF_DATE,
  TEST_AUGUST_WORK_DAY,
  TEST_SEPTEMBER_BALANCING_DAY,
  TEST_WORK_DAY_INPUT,
} from "./testFixtures";
import { calculateWorkDay } from "./workDay";

test("salary is 47% of income excluding VAT", () => {
  const accrued = calculateAccruedSalary(
    EXPECTED_DAILY_SALARY.incomeExVat,
    EXPECTED_DAILY_SALARY.salaryRate,
  );
  assert.equal(accrued.toFixed(2), EXPECTED_DAILY_SALARY.salary);
});

test("daily workday produces 1457.94 SEK salary from 3300 gross", () => {
  const workDay = calculateWorkDay(TEST_WORK_DAY_INPUT);
  assert.equal(workDay.totalIncome.toFixed(2), "3300.00");
  assert.equal(workDay.vatAmount.toFixed(2), "198.00");
  assert.equal(workDay.incomeExVat.toFixed(2), "3102.00");
  assert.equal(workDay.tips.toFixed(2), "150.00");
  assert.equal(calculateAccruedSalary(workDay.incomeExVat).toFixed(2), "1457.94");
  assert.equal("calculatedSalary" in workDay, false);
});

test("tips are not included in accrued salary", () => {
  const workDay = calculateWorkDay(TEST_WORK_DAY_INPUT);
  const fromIncomeExVat = calculateAccruedSalary(workDay.incomeExVat);
  const ifTipsWereIncluded = calculateAccruedSalary(workDay.incomeExVat.plus(workDay.tips));

  assert.equal(fromIncomeExVat.toFixed(2), "1457.94");
  assert.equal(ifTipsWereIncluded.toFixed(2), "1528.44");
  assert.notEqual(fromIncomeExVat.toFixed(2), ifTipsWereIncluded.toFixed(2));
});

test("September workdays aggregate salary from monthly income excluding VAT", () => {
  const septemberDays = [TEST_SEPTEMBER_BALANCING_DAY, TEST_WORK_DAY_INPUT].map((input) =>
    calculateWorkDay(input),
  );
  const totals = aggregateWorkDaysForPayroll(2026, 9, septemberDays);

  assert.equal(totals.periodStart, "2026-09-01");
  assert.equal(totals.periodEnd, "2026-09-30");
  assert.equal(totals.totalWorkDays, 2);
  assert.equal(totals.totalWorkHours.toString(), "24.25");
  assert.equal(totals.totalIncome.toFixed(2), "60000.00");
  assert.equal(totals.totalVat.toFixed(2), "3600.00");
  assert.equal(totals.totalIncomeExVat.toFixed(2), "56400.00");
  assert.equal(totals.totalCosts.toFixed(2), "6000.00");
  assert.equal(totals.totalTips.toFixed(2), "2300.00");
  assert.equal(totals.accruedSalary.toFixed(2), "26508.00");
  assert.equal(
    totals.accruedSalary.toFixed(2),
    calculateAccruedSalary(totals.totalIncomeExVat).toFixed(2),
  );
});

test("editing a workday recalculates monthly accrued salary", () => {
  const original = calculateWorkDay(TEST_WORK_DAY_INPUT);
  const edited = calculateWorkDay({
    ...TEST_WORK_DAY_INPUT,
    cashIncome: "700",
  });

  const before = aggregateWorkDaysForPayroll(2026, 9, [original]);
  const after = aggregateWorkDaysForPayroll(2026, 9, [edited]);

  assert.equal(before.accruedSalary.toFixed(2), "1457.94");
  assert.equal(after.totalIncome.toFixed(2), "3500.00");
  assert.equal(after.totalIncomeExVat.toFixed(2), "3290.00");
  assert.equal(after.accruedSalary.toFixed(2), "1546.30");
});

test("removing a workday recalculates monthly accrued salary", () => {
  const days = [TEST_SEPTEMBER_BALANCING_DAY, TEST_WORK_DAY_INPUT].map((input) =>
    calculateWorkDay(input),
  );
  const withBoth = aggregateWorkDaysForPayroll(2026, 9, days);
  const afterDelete = aggregateWorkDaysForPayroll(2026, 9, [days[0]]);

  assert.equal(withBoth.accruedSalary.toFixed(2), "26508.00");
  assert.equal(afterDelete.totalIncomeExVat.toFixed(2), "53298.00");
  assert.equal(afterDelete.accruedSalary.toFixed(2), "25050.06");
});

test("September is accruing on 19 September 2026", () => {
  const status = resolveSalaryStatus({
    year: 2026,
    month: 9,
    accruedSalary: EXPECTED_SEPTEMBER_PAYROLL.accruedSalary,
    remainingAmount: EXPECTED_SEPTEMBER_PAYROLL.accruedSalary,
    totalPaid: "0",
    asOfDate: TEST_AS_OF_DATE,
  });
  assert.equal(status, "ACCRUING");
});

test("September becomes READY when October starts", () => {
  const status = resolveSalaryStatus({
    year: 2026,
    month: 9,
    accruedSalary: EXPECTED_SEPTEMBER_PAYROLL.accruedSalary,
    remainingAmount: EXPECTED_SEPTEMBER_PAYROLL.accruedSalary,
    totalPaid: "0",
    asOfDate: "2026-10-01",
  });
  assert.equal(status, "READY");
});

test("partial payment leaves remaining salary and does not change accrued salary", () => {
  const septemberDays = [TEST_SEPTEMBER_BALANCING_DAY, TEST_WORK_DAY_INPUT].map((input) =>
    calculateWorkDay(input),
  );
  const initial = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(2026, 9, septemberDays),
    asOfDate: "2026-10-01",
  });
  const afterPartial = applySalaryPayment(
    initial,
    { paymentDate: "2026-10-10", amount: "15000" },
    "2026-10-10",
  );

  assert.equal(afterPartial.accruedSalary.toFixed(2), "26508.00");
  assert.equal(afterPartial.totalPaid.toFixed(2), "15000.00");
  assert.equal(afterPartial.remainingAmount.toFixed(2), "11508.00");
  assert.equal(afterPartial.salaryStatus, "PARTIALLY_PAID");
});

test("multiple payments can settle a month without changing accrued salary", () => {
  const septemberDays = [TEST_SEPTEMBER_BALANCING_DAY, TEST_WORK_DAY_INPUT].map((input) =>
    calculateWorkDay(input),
  );
  const initial = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(2026, 9, septemberDays),
    asOfDate: "2026-10-01",
  });

  const afterFirst = applySalaryPayment(
    initial,
    { paymentDate: "2026-10-10", amount: "15000" },
    "2026-10-10",
  );
  const afterSecond = applySalaryPayment(
    afterFirst,
    { paymentDate: "2026-10-25", amount: "11508" },
    "2026-10-25",
  );

  assert.equal(afterFirst.remainingAmount.toFixed(2), "11508.00");
  assert.equal(afterSecond.accruedSalary.toFixed(2), "26508.00");
  assert.equal(afterSecond.totalPaid.toFixed(2), "26508.00");
  assert.equal(afterSecond.remainingAmount.toFixed(2), "0.00");
  assert.equal(afterSecond.salaryStatus, "PAID");
  assert.equal(afterSecond.paymentDate, "2026-10-25");
  assert.equal(afterSecond.payments.length, 2);
});

test("remaining salary is accrued minus total paid", () => {
  assert.equal(calculateRemainingSalary("26508", "15000").toFixed(2), "11508.00");
  assert.equal(calculateRemainingSalary("1457.94", "1457.94").toFixed(2), "0.00");
  assert.equal(
    calculateTotalPaid([
      { paymentDate: "2026-10-10", amount: "15000" },
      { paymentDate: "2026-10-25", amount: "11508" },
    ]).toFixed(2),
    "26508.00",
  );
});

test("payment larger than remaining salary is rejected", () => {
  const initial = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(2026, 9, [calculateWorkDay(TEST_WORK_DAY_INPUT)]),
    asOfDate: "2026-10-01",
  });

  assert.throws(
    () =>
      applySalaryPayment(
        initial,
        { paymentDate: "2026-10-10", amount: "1457.95" },
        "2026-10-10",
      ),
    CalculationError,
  );
});

test("October starts a new accrued salary balance", () => {
  const september = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(2026, 9, [
      calculateWorkDay(TEST_SEPTEMBER_BALANCING_DAY),
      calculateWorkDay(TEST_WORK_DAY_INPUT),
    ]),
    asOfDate: "2026-10-10",
  });
  const october = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(2026, 10, []),
    asOfDate: "2026-10-10",
  });

  assert.equal(september.accruedSalary.toFixed(2), "26508.00");
  assert.equal(september.salaryStatus, "READY");
  assert.equal(october.accruedSalary.toFixed(2), "0.00");
  assert.equal(october.salaryStatus, "ACCRUING");
  assert.equal(october.periodStart, "2026-10-01");
  assert.equal(october.periodEnd, "2026-10-31");
});

test("monthly summary keeps tips and accrued salary separate", () => {
  const state = buildMonthlyPayrollState({
    totals: aggregateWorkDaysForPayroll(2026, 9, [
      calculateWorkDay(TEST_SEPTEMBER_BALANCING_DAY),
      calculateWorkDay(TEST_WORK_DAY_INPUT),
    ]),
    asOfDate: "2026-10-01",
  });
  const summary = formatMonthlySummarySv(state);

  assert.match(summary, /TAXILOG — SEPTEMBER 2026/);
  assert.match(summary, /INKÖRT:\n60 000 kr/);
  assert.match(summary, /DRICKS:\n2 300 kr/);
  assert.match(summary, /INNESTÅENDE LÖN:\n26 508 kr/);
  assert.match(summary, /UTBETALT:\n0 kr/);
  assert.match(summary, /ÅTERSTÅENDE:\n26 508 kr/);
  assert.match(summary, /STATUS:\nKLAR FÖR UTBETALNING/);
});

test("August workday produces the previous-month accrued salary", () => {
  const totals = aggregateWorkDaysForPayroll(2026, 8, [calculateWorkDay(TEST_AUGUST_WORK_DAY)]);
  const paid = buildMonthlyPayrollState({
    totals,
    payments: [
      {
        paymentDate: EXPECTED_AUGUST_PAYROLL.paymentDate,
        amount: EXPECTED_AUGUST_PAYROLL.paidAmount,
      },
    ],
    asOfDate: TEST_AS_OF_DATE,
  });

  assert.equal(totals.totalIncome.toFixed(2), "58000.00");
  assert.equal(totals.totalVat.toFixed(2), "3480.00");
  assert.equal(totals.totalIncomeExVat.toFixed(2), "54520.00");
  assert.equal(totals.accruedSalary.toFixed(2), "25624.40");
  assert.equal(paid.salaryStatus, "PAID");
  assert.equal(paid.remainingAmount.toFixed(2), "0.00");
});
