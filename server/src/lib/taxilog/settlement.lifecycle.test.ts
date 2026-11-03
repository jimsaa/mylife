import assert from "node:assert/strict";
import { test } from "node:test";
import Decimal from "decimal.js";
import { CalculationError } from "./calculations/errors";
import {
  privateGrossPaymentNotes,
  surplusAllocationNotes,
  surplusSourceKey,
} from "./calculations/savings";
import {
  emptyTaxiLogState,
  loadMonthOverviewFromState,
  recordManualSavingsInState,
  saveDailyLogToState,
  settleMonthInState,
  unlockMonthInState,
  type TaxiLogState,
} from "./service";
import {
  settleMonthInState as vercelSettle,
  unlockMonthInState as vercelUnlock,
} from "../../../../api/_lib/taxilog/service.ts";

function stateWithAccruedSalary(accrued: string, extras?: { tips?: string; bonus?: string }): TaxiLogState {
  const incomeExVat = new Decimal(accrued).div("0.47").toFixed(2);
  return {
    ...emptyTaxiLogState(),
    workDays: [
      {
        date: "2026-12-15",
        workHours: "1",
        totalIncome: incomeExVat,
        ownBookings: "0",
        otherIncome: incomeExVat,
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

function withNovemberTipsAndBonus(state: TaxiLogState): TaxiLogState {
  return saveDailyLogToState(state, {
    date: "2026-11-02",
    grossIncome: "1000",
    tips: "50",
    bonus: "100",
    workedHours: "1",
    chargingKwh: "0",
    ownBookings: "0",
    otherIncome: "1000",
  });
}

function settlementSnapshot(state: TaxiLogState, year: number, month: number) {
  const overview = loadMonthOverviewFromState(state, year, month);
  return {
    locked: overview.settlementLocked,
    privateGross: overview.privateGrossAllocation,
    tax: overview.preliminaryTax,
    net: overview.projectedPrivateNet,
    netTaken: overview.privateNetTaken,
    surplus: overview.savings.fromSalarySurplus,
    remaining: overview.salaryRemaining,
    payments: state.payments
      .filter((payment) => payment.year === year && payment.month === month)
      .map((payment) => ({ notes: payment.notes, amount: payment.amount, paymentDate: payment.paymentDate }))
      .sort((a, b) => String(a.notes).localeCompare(String(b.notes))),
    surplusEntries: state.savingsLedger
      .filter((entry) => entry.sourceKey === surplusSourceKey(year, month))
      .map((entry) => ({ kind: entry.kind, amount: entry.amount, sourceKey: entry.sourceKey })),
  };
}

test("settlement lifecycle books, unlocks, restores and re-settles identically", () => {
  const started = withNovemberTipsAndBonus(stateWithAccruedSalary("20000"));
  const first = settleMonthInState(started, 2026, 12, "2026-12-31");
  const firstSnap = settlementSnapshot(first, 2026, 12);

  assert.equal(firstSnap.locked, true);
  assert.equal(firstSnap.privateGross, "15500.00");
  assert.equal(firstSnap.tax, "2319.00");
  assert.equal(firstSnap.net, "13181.00");
  assert.equal(firstSnap.netTaken, "13181.00");
  assert.equal(firstSnap.surplus, "4500.00");
  assert.equal(firstSnap.remaining, "0");
  assert.deepEqual(
    first.payments.filter((payment) => payment.year === 2026 && payment.month === 12).map((payment) => payment.notes).sort(),
    [privateGrossPaymentNotes(2026, 12), surplusAllocationNotes(2026, 12)],
  );
  assert.equal(first.savingsLedger.filter((entry) => entry.sourceKey === surplusSourceKey(2026, 12)).length, 1);
  assert.equal(loadMonthOverviewFromState(first, 2026, 11).savings.fromTips, "50.00");
  assert.equal(loadMonthOverviewFromState(first, 2026, 11).savings.fromBonus, "100.00");

  const unlocked = unlockMonthInState(first, 2026, 12);
  const unlockedSnap = settlementSnapshot(unlocked, 2026, 12);
  assert.equal(unlockedSnap.locked, false);
  assert.equal(unlockedSnap.netTaken, "0.00");
  assert.equal(unlockedSnap.surplus, "0.00");
  assert.equal(unlocked.payments.filter((payment) => payment.year === 2026 && payment.month === 12).length, 0);
  assert.equal(unlocked.savingsLedger.filter((entry) => entry.sourceKey === surplusSourceKey(2026, 12)).length, 0);
  assert.equal(loadMonthOverviewFromState(unlocked, 2026, 11).savings.fromTips, "50.00");
  assert.equal(loadMonthOverviewFromState(unlocked, 2026, 11).savings.fromBonus, "100.00");

  const unlockedAgain = unlockMonthInState(unlocked, 2026, 12);
  assert.deepEqual(settlementSnapshot(unlockedAgain, 2026, 12), unlockedSnap);

  const second = settleMonthInState(unlocked, 2026, 12, "2026-12-31");
  assert.deepEqual(settlementSnapshot(second, 2026, 12), firstSnap);
  assert.equal(loadMonthOverviewFromState(second, 2026, 11).savings.fromTips, "50.00");
  assert.equal(loadMonthOverviewFromState(second, 2026, 11).savings.fromBonus, "100.00");
});

test("settling a locked month does not create duplicate postings", () => {
  const settled = settleMonthInState(stateWithAccruedSalary("20000"), 2026, 12, "2026-12-31");
  assert.throws(() => settleMonthInState(settled, 2026, 12, "2026-12-31"), CalculationError);
  assert.equal(settled.payments.filter((payment) => payment.year === 2026 && payment.month === 12).length, 2);
  assert.equal(settled.savingsLedger.filter((entry) => entry.sourceKey === surplusSourceKey(2026, 12)).length, 1);
});

test("unlock does not remove independent savings or other months", () => {
  const withManual = recordManualSavingsInState(withNovemberTipsAndBonus(stateWithAccruedSalary("18000")), {
    date: "2026-12-20",
    amount: "75",
    kind: "MANUAL_DEPOSIT",
    description: "Manuell insättning",
  });
  const settled = settleMonthInState(withManual, 2026, 12, "2026-12-31");
  const unlocked = unlockMonthInState(settled, 2026, 12);
  const savings = loadMonthOverviewFromState(unlocked, 2026, 12).savings;
  assert.equal(savings.fromSalarySurplus, "0.00");
  assert.equal(savings.fromManualDeposits, "75.00");
  assert.equal(loadMonthOverviewFromState(unlocked, 2026, 11).savings.fromTips, "50.00");
  assert.equal(loadMonthOverviewFromState(unlocked, 2026, 11).savings.fromBonus, "100.00");
});

test("below 15500 settlement does not book 13181 net and unlocks cleanly", () => {
  const settled = settleMonthInState(stateWithAccruedSalary("14000"), 2026, 12, "2026-12-31");
  const overview = loadMonthOverviewFromState(settled, 2026, 12);
  assert.equal(overview.privateGrossAllocation, "14000.00");
  assert.equal(overview.projectedPrivateNet, "0.00");
  assert.equal(overview.privateNetTaken, "0.00");
  assert.equal(overview.savings.fromSalarySurplus, "0.00");
  assert.equal(settled.payments.filter((payment) => payment.notes === surplusAllocationNotes(2026, 12)).length, 0);

  const unlocked = unlockMonthInState(settled, 2026, 12);
  assert.equal(unlocked.payments.filter((payment) => payment.year === 2026 && payment.month === 12).length, 0);
  assert.equal(loadMonthOverviewFromState(unlocked, 2026, 12).settlementLocked, false);
});

test("Express and Vercel settle and unlock the same 20000 month", () => {
  const started = stateWithAccruedSalary("20000");
  const serverSettled = settleMonthInState(started, 2026, 12, "2026-12-31");
  const vercelSettled = vercelSettle(started, 2026, 12, "2026-12-31");
  assert.deepEqual(settlementSnapshot(serverSettled, 2026, 12), settlementSnapshot(vercelSettled, 2026, 12));

  const serverUnlocked = unlockMonthInState(serverSettled, 2026, 12);
  const vercelUnlocked = vercelUnlock(vercelSettled, 2026, 12);
  assert.deepEqual(settlementSnapshot(serverUnlocked, 2026, 12), settlementSnapshot(vercelUnlocked, 2026, 12));
});
