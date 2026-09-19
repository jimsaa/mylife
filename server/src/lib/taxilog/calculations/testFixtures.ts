import type { WorkDayInput } from "./workDay";

export const TEST_WORK_DAY_INPUT: WorkDayInput = {
  date: "2026-09-19",
  startTime: "06:30",
  endTime: "18:45",
  startOdometer: "12000",
  endOdometer: "12284",
  numberOfTrips: 18,
  cashIncome: "500",
  cardIncome: "2500",
  swishIncome: "300",
  otherIncome: "0",
  tips: "150",
  energyCost: "180",
  otherCosts: "50",
  vatRate: "6",
  notes: "Testdata för POC",
};

/** Completes September so monthly income totals 60 000 kr. */
export const TEST_SEPTEMBER_BALANCING_DAY: WorkDayInput = {
  date: "2026-09-01",
  startTime: "06:00",
  endTime: "18:00",
  startOdometer: "10000",
  endOdometer: "10500",
  numberOfTrips: 20,
  cashIncome: "6700",
  cardIncome: "48000",
  swishIncome: "2000",
  otherIncome: "0",
  tips: "2150",
  energyCost: "5000",
  otherCosts: "770",
  vatRate: "6",
  notes: "September kompletterande testdag",
};

export const TEST_AUGUST_WORK_DAY: WorkDayInput = {
  date: "2026-08-31",
  startTime: "06:00",
  endTime: "18:30",
  startOdometer: "9000",
  endOdometer: "9520",
  numberOfTrips: 22,
  cashIncome: "8000",
  cardIncome: "48000",
  swishIncome: "2000",
  otherIncome: "0",
  tips: "2000",
  energyCost: "5000",
  otherCosts: "820",
  vatRate: "6",
  notes: "Augusti testdag",
};

export const TEST_CHARGING_INPUT = {
  date: "2026-09-19",
  kwh: "32.4",
  pricePerKwh: "1.85",
  location: "Hemma",
};

export const EXPECTED_WORK_DAY = {
  totalIncome: "3300",
  vatAmount: "198",
  incomeExVat: "3102",
  totalCosts: "230",
  workHours: "12.25",
  totalKm: "284",
  tips: "150",
};

export const EXPECTED_DAILY_SALARY = {
  grossIncome: "3300",
  vatRate: "6",
  vatAmount: "198",
  incomeExVat: "3102",
  salaryRate: "47",
  salary: "1457.94",
};

export const EXPECTED_SEPTEMBER_PAYROLL = {
  year: 2026,
  month: 9,
  totalIncome: "60000",
  totalVat: "3600",
  totalIncomeExVat: "56400",
  totalCosts: "6000",
  totalTips: "2300",
  accruedSalary: "26508",
};

export const EXPECTED_AUGUST_PAYROLL = {
  year: 2026,
  month: 8,
  totalIncome: "58000",
  totalVat: "3480",
  totalCosts: "5820",
  incomeExVat: "54520",
  accruedSalary: "25624.40",
  paidAmount: "25624.40",
  paymentDate: "2026-09-25",
};

export const EXPECTED_CHARGING = {
  kwh: "32.4",
  pricePerKwh: "1.85",
  totalCost: "59.94",
};

export const TEST_AS_OF_DATE = "2026-09-19";
