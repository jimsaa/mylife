import type { MonthlyPayrollState } from "../calculations/payroll";
import { exportDecimal, exportLines } from "./format";

export const TAXILOG_MONTHLY_IMPORT_VERSION = "1";

export function formatMonthlyExport(state: MonthlyPayrollState): string {
  const body = exportLines([
    ["YEAR", String(state.year)],
    ["MONTH", String(state.month)],
    ["WORK_DAYS", String(state.totalWorkDays)],
    ["WORK_HOURS", exportDecimal(state.totalWorkHours)],
    ["TOTAL_KM", exportDecimal(state.totalKm)],
    ["TOTAL_TRIPS", String(state.totalTrips)],
    ["TOTAL_INCOME", exportDecimal(state.totalIncome)],
    ["TOTAL_TIPS", exportDecimal(state.totalTips)],
    ["VAT_RATE", exportDecimal(state.vatRate)],
    ["TOTAL_VAT", exportDecimal(state.totalVat)],
    ["INCOME_EX_VAT", exportDecimal(state.totalIncomeExVat)],
    ["TOTAL_COSTS", exportDecimal(state.totalCosts)],
    ["ACCRUED_SALARY", exportDecimal(state.accruedSalary)],
    ["TOTAL_PAID", exportDecimal(state.totalPaid)],
    ["REMAINING_SALARY", exportDecimal(state.remainingAmount)],
    ["SALARY_STATUS", state.salaryStatus],
  ]);

  return [
    "TAXILOG_MONTHLY_IMPORT",
    `VERSION=${TAXILOG_MONTHLY_IMPORT_VERSION}`,
    "",
    body,
    "",
    "END_TAXILOG_MONTHLY_IMPORT",
  ].join("\n");
}
