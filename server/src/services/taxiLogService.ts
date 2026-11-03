import { getDb } from '../db/connection.js';
import {
  buildDailyExportFromState,
  emptyTaxiLogState,
  loadDailyLogFromState,
  loadMonthOverviewFromState,
  previewImport,
  recordManualSavingsInState,
  recordSalaryPaymentInState,
  saveDailyLogToState,
  seedRealTaxiLogData,
  settleMonthInState,
  unlockMonthInState,
  type DailyLogInput,
  type TaxiChargingRecord,
  type TaxiLogState,
  type TaxiPaymentRecord,
  type TaxiPayrollRecord,
  type TaxiWorkDayRecord,
} from '../lib/taxilog/service.js';
import { parseTaxiLogImport } from '../lib/taxilog/import/taxilogImport.js';
import { DEFAULT_PRIVATE_NET_WITHDRAWAL, DEFAULT_VAT_RATE } from '../lib/taxilog/settings/defaults.js';
import type { SavingsLedgerEntry } from '../lib/taxilog/calculations/savings.js';

type WorkDayRow = {
  date: string;
  work_hours: string;
  total_income: string;
  own_bookings: string | null;
  other_income: string | null;
  tips: string;
  bonus: string | null;
  vat_rate: string;
  vat_amount: string;
  income_ex_vat: string;
  total_costs: string;
  total_km: string;
  number_of_trips: number;
};

type ChargingRow = { date: string; kwh: string; location: string };
type PayrollRow = {
  year: number;
  month: number;
  period_start: string;
  period_end: string;
  total_work_days: number;
  total_work_hours: string;
  total_income: string;
  total_tips: string;
  vat_rate: string | null;
  total_vat: string;
  total_income_ex_vat: string;
  total_costs: string;
  accrued_salary: string;
  salary_status: string;
  payment_date: string | null;
  paid_amount: string;
  remaining_amount: string;
  settlement_locked: number | null;
  settlement_locked_at: string | null;
};
type PaymentRow = {
  id: string;
  year: number;
  month: number;
  payment_date: string;
  amount: string;
  notes: string | null;
};
type SavingsRow = {
  id: string;
  occurred_at: string;
  year: number;
  month: number;
  kind: SavingsLedgerEntry['kind'];
  amount: string;
  source_key: string;
  description: string;
};

function readState(): TaxiLogState {
  const db = getDb();
  const settings = db
    .prepare(`SELECT vat_rate, private_net_target FROM taxi_log_settings WHERE id = 'default'`)
    .get() as { vat_rate: string; private_net_target?: string } | undefined;
  const workDays = db.prepare(`SELECT * FROM taxi_work_days`).all() as WorkDayRow[];
  const charging = db.prepare(`SELECT date, kwh, location FROM taxi_charging_sessions`).all() as ChargingRow[];
  const payrolls = db.prepare(`SELECT * FROM taxi_monthly_payroll`).all() as PayrollRow[];
  const payments = db.prepare(`SELECT * FROM taxi_salary_payments`).all() as PaymentRow[];
  const savings = db.prepare(`SELECT * FROM taxi_savings_ledger`).all() as SavingsRow[];

  return {
    vatRate: settings?.vat_rate ?? DEFAULT_VAT_RATE,
    privateNetTarget: settings?.private_net_target ?? DEFAULT_PRIVATE_NET_WITHDRAWAL,
    workDays: workDays.map(
      (row): TaxiWorkDayRecord => ({
        date: row.date,
        workHours: row.work_hours,
        totalIncome: row.total_income,
        ownBookings: row.own_bookings ?? null,
        otherIncome: row.other_income ?? null,
        tips: row.tips,
        bonus: row.bonus ?? null,
        vatRate: row.vat_rate,
        vatAmount: row.vat_amount,
        incomeExVat: row.income_ex_vat,
        totalCosts: row.total_costs,
        totalKm: row.total_km,
        numberOfTrips: row.number_of_trips,
      }),
    ),
    charging: charging.map(
      (row): TaxiChargingRecord => ({
        date: row.date,
        kwh: row.kwh,
        location: row.location,
      }),
    ),
    payrolls: payrolls.map(
      (row): TaxiPayrollRecord => ({
        year: row.year,
        month: row.month,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        totalWorkDays: row.total_work_days,
        totalWorkHours: row.total_work_hours,
        totalIncome: row.total_income,
        totalTips: row.total_tips,
        vatRate: row.vat_rate,
        totalVat: row.total_vat,
        totalIncomeExVat: row.total_income_ex_vat,
        totalCosts: row.total_costs,
        accruedSalary: row.accrued_salary,
        salaryStatus: row.salary_status,
        paymentDate: row.payment_date,
        paidAmount: row.paid_amount,
        remainingAmount: row.remaining_amount,
        settlementLocked: Boolean(row.settlement_locked),
        settlementLockedAt: row.settlement_locked_at ?? null,
      }),
    ),
    payments: payments.map(
      (row): TaxiPaymentRecord => ({
        id: row.id,
        year: row.year,
        month: row.month,
        paymentDate: row.payment_date,
        amount: row.amount,
        notes: row.notes,
      }),
    ),
    savingsLedger: savings.map((row) => ({
      id: row.id,
      occurredAt: row.occurred_at,
      year: row.year,
      month: row.month,
      kind: row.kind,
      amount: row.amount,
      sourceKey: row.source_key,
      description: row.description,
    })),
  };
}

function writeState(state: TaxiLogState): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO taxi_log_settings (id, vat_rate, private_net_target, updated_at)
       VALUES ('default', ?, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET
         vat_rate = excluded.vat_rate,
         private_net_target = excluded.private_net_target,
         updated_at = datetime('now')`,
    ).run(state.vatRate, state.privateNetTarget);

    db.exec(`DELETE FROM taxi_salary_payments`);
    db.exec(`DELETE FROM taxi_savings_ledger`);
    db.exec(`DELETE FROM taxi_monthly_payroll`);
    db.exec(`DELETE FROM taxi_charging_sessions`);
    db.exec(`DELETE FROM taxi_work_days`);

    const insertDay = db.prepare(`
      INSERT INTO taxi_work_days (
        date, work_hours, total_income, own_bookings, other_income, tips, bonus,
        vat_rate, vat_amount, income_ex_vat, total_costs, total_km, number_of_trips, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const day of state.workDays) {
      insertDay.run(
        day.date,
        day.workHours,
        day.totalIncome,
        day.ownBookings,
        day.otherIncome,
        day.tips,
        day.bonus,
        day.vatRate,
        day.vatAmount,
        day.incomeExVat,
        day.totalCosts,
        day.totalKm,
        day.numberOfTrips,
      );
    }

    const insertCharge = db.prepare(`
      INSERT INTO taxi_charging_sessions (date, kwh, location, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);
    for (const session of state.charging) {
      insertCharge.run(session.date, session.kwh, session.location);
    }

    const insertPayroll = db.prepare(`
      INSERT INTO taxi_monthly_payroll (
        year, month, period_start, period_end, total_work_days, total_work_hours,
        total_income, total_tips, vat_rate, total_vat, total_income_ex_vat, total_costs,
        accrued_salary, salary_status, payment_date, paid_amount, remaining_amount,
        settlement_locked, settlement_locked_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const payroll of state.payrolls) {
      insertPayroll.run(
        payroll.year,
        payroll.month,
        payroll.periodStart,
        payroll.periodEnd,
        payroll.totalWorkDays,
        payroll.totalWorkHours,
        payroll.totalIncome,
        payroll.totalTips,
        payroll.vatRate,
        payroll.totalVat,
        payroll.totalIncomeExVat,
        payroll.totalCosts,
        payroll.accruedSalary,
        payroll.salaryStatus,
        payroll.paymentDate,
        payroll.paidAmount,
        payroll.remainingAmount,
        payroll.settlementLocked ? 1 : 0,
        payroll.settlementLockedAt,
      );
    }

    const insertPayment = db.prepare(`
      INSERT INTO taxi_salary_payments (id, year, month, payment_date, amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const payment of state.payments) {
      insertPayment.run(payment.id, payment.year, payment.month, payment.paymentDate, payment.amount, payment.notes);
    }

    const insertSavings = db.prepare(`
      INSERT INTO taxi_savings_ledger (id, occurred_at, year, month, kind, amount, source_key, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const entry of state.savingsLedger) {
      insertSavings.run(
        entry.id,
        entry.occurredAt,
        entry.year,
        entry.month,
        entry.kind,
        entry.amount,
        entry.sourceKey,
        entry.description,
      );
    }
  });
  tx();
}

function persistIfChanged(current: TaxiLogState, next: TaxiLogState): TaxiLogState {
  if (JSON.stringify(current) !== JSON.stringify(next)) {
    writeState(next);
  }
  return next;
}

export function ensureTaxiLogSeeded(): TaxiLogState {
  const current = readState();
  return persistIfChanged(current, seedRealTaxiLogData(current));
}

export function getTaxiLogMonth(year: number, month: number) {
  return loadMonthOverviewFromState(ensureTaxiLogSeeded(), year, month);
}

export function getTaxiLogDay(date: string) {
  return loadDailyLogFromState(ensureTaxiLogSeeded(), date);
}

export function getTaxiLogExport(date: string) {
  return buildDailyExportFromState(ensureTaxiLogSeeded(), date);
}

export function saveTaxiLogDay(input: DailyLogInput) {
  const next = saveDailyLogToState(ensureTaxiLogSeeded(), input);
  writeState(next);
  return loadDailyLogFromState(next, input.date);
}

export function parseTaxiLogText(text: string) {
  return previewImport(ensureTaxiLogSeeded(), parseTaxiLogImport(text));
}

export function addTaxiSalaryPayment(input: {
  year: number;
  month: number;
  paymentDate: string;
  amount: string;
  notes?: string | null;
}) {
  const next = recordSalaryPaymentInState(ensureTaxiLogSeeded(), input.year, input.month, input);
  writeState(next);
  return loadMonthOverviewFromState(next, input.year, input.month);
}

export function settleTaxiLogMonth(year: number, month: number) {
  const next = settleMonthInState(ensureTaxiLogSeeded(), year, month);
  writeState(next);
  return loadMonthOverviewFromState(next, year, month);
}

export function unlockTaxiLogMonth(year: number, month: number) {
  const next = unlockMonthInState(ensureTaxiLogSeeded(), year, month);
  writeState(next);
  return loadMonthOverviewFromState(next, year, month);
}

export function addTaxiSavingsEntry(input: {
  date: string;
  amount: string;
  kind: 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAWAL';
  description: string;
}) {
  const next = recordManualSavingsInState(ensureTaxiLogSeeded(), input);
  writeState(next);
  const occurred = input.date.split('-').map(Number);
  return loadMonthOverviewFromState(next, occurred[0] ?? 0, occurred[1] ?? 1);
}

export function resetTaxiLogForTests(): void {
  writeState(emptyTaxiLogState());
}
