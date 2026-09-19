import { getDb } from '../db/connection.js';
import {
  buildDailyExportFromState,
  emptyTaxiLogState,
  loadDailyLogFromState,
  loadMonthOverviewFromState,
  recordSalaryPaymentInState,
  saveDailyLogToState,
  seedRealTaxiLogData,
  type DailyLogInput,
  type TaxiChargingRecord,
  type TaxiLogState,
  type TaxiPaymentRecord,
  type TaxiPayrollRecord,
  type TaxiWorkDayRecord,
} from '../lib/taxilog/service.js';
import { calculateAccruedSalary } from '../lib/taxilog/calculations/payroll.js';
import { calculateDailyFinancials } from '../lib/taxilog/data/dailyFinancials.js';
import { parseTaxiLogImport } from '../lib/taxilog/import/taxilogImport.js';
import { DEFAULT_VAT_RATE } from '../lib/taxilog/settings/defaults.js';

type WorkDayRow = {
  date: string;
  work_hours: string;
  total_income: string;
  tips: string;
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
};
type PaymentRow = {
  id: string;
  year: number;
  month: number;
  payment_date: string;
  amount: string;
  notes: string | null;
};

function readState(): TaxiLogState {
  const db = getDb();
  const settings = db.prepare(`SELECT vat_rate FROM taxi_log_settings WHERE id = 'default'`).get() as
    | { vat_rate: string }
    | undefined;
  const workDays = db.prepare(`SELECT * FROM taxi_work_days`).all() as WorkDayRow[];
  const charging = db.prepare(`SELECT date, kwh, location FROM taxi_charging_sessions`).all() as ChargingRow[];
  const payrolls = db.prepare(`SELECT * FROM taxi_monthly_payroll`).all() as PayrollRow[];
  const payments = db.prepare(`SELECT * FROM taxi_salary_payments`).all() as PaymentRow[];

  return {
    vatRate: settings?.vat_rate ?? DEFAULT_VAT_RATE,
    workDays: workDays.map(
      (row): TaxiWorkDayRecord => ({
        date: row.date,
        workHours: row.work_hours,
        totalIncome: row.total_income,
        tips: row.tips,
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
  };
}

function writeState(state: TaxiLogState): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO taxi_log_settings (id, vat_rate, updated_at)
       VALUES ('default', ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET vat_rate = excluded.vat_rate, updated_at = datetime('now')`,
    ).run(state.vatRate);

    db.exec(`DELETE FROM taxi_salary_payments`);
    db.exec(`DELETE FROM taxi_monthly_payroll`);
    db.exec(`DELETE FROM taxi_charging_sessions`);
    db.exec(`DELETE FROM taxi_work_days`);

    const insertDay = db.prepare(`
      INSERT INTO taxi_work_days (
        date, work_hours, total_income, tips, vat_rate, vat_amount, income_ex_vat,
        total_costs, total_km, number_of_trips, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    for (const day of state.workDays) {
      insertDay.run(
        day.date,
        day.workHours,
        day.totalIncome,
        day.tips,
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
        accrued_salary, salary_status, payment_date, paid_amount, remaining_amount, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
      );
    }

    const insertPayment = db.prepare(`
      INSERT INTO taxi_salary_payments (id, year, month, payment_date, amount, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const payment of state.payments) {
      insertPayment.run(payment.id, payment.year, payment.month, payment.paymentDate, payment.amount, payment.notes);
    }
  });
  tx();
}

export function ensureTaxiLogSeeded(): TaxiLogState {
  const current = readState();
  const seeded = seedRealTaxiLogData(current);
  if (seeded !== current && seeded.workDays.length !== current.workDays.length) {
    writeState(seeded);
    return seeded;
  }
  if (current.workDays.length === 0 && seeded.workDays.length > 0) {
    writeState(seeded);
    return seeded;
  }
  return current;
}

export function getTaxiLogMonth(year: number, month: number) {
  const state = ensureTaxiLogSeeded();
  return loadMonthOverviewFromState(state, year, month);
}

export function getTaxiLogDay(date: string) {
  const state = ensureTaxiLogSeeded();
  return loadDailyLogFromState(state, date);
}

export function getTaxiLogExport(date: string) {
  const state = ensureTaxiLogSeeded();
  return buildDailyExportFromState(state, date);
}

export function saveTaxiLogDay(input: DailyLogInput) {
  const next = saveDailyLogToState(ensureTaxiLogSeeded(), input);
  writeState(next);
  return loadDailyLogFromState(next, input.date);
}

export function parseTaxiLogText(text: string) {
  const parsed = parseTaxiLogImport(text);
  const state = ensureTaxiLogSeeded();
  const preview = calculateDailyFinancials({
    grossIncome: parsed.grossIncome,
    tips: parsed.tips,
    vatRate: state.vatRate,
  });
  return {
    parsed,
    preview: {
      grossIncome: preview.totalIncome.toString(),
      vatAmount: preview.vatAmount.toFixed(2),
      netIncome: preview.incomeExVat.toFixed(2),
      tips: preview.tips.toFixed(2),
      estimatedSalary: calculateAccruedSalary(preview.incomeExVat).toFixed(2),
    },
  };
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

export function resetTaxiLogForTests(): void {
  writeState(emptyTaxiLogState());
}
