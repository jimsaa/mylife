import { PRIVATE_GROSS_THRESHOLD } from "../calculations/taxTable33_2026";

/** Default VAT rate as a percent value. 6 means 6%. */
export const DEFAULT_VAT_RATE = "6";

/** Salary as a percent of income excluding VAT. 47 means 47%. */
export const DEFAULT_SALARY_RATE = "47";

/** Fixed private gross salary threshold. Surplus above this goes to savings. */
export const DEFAULT_PRIVATE_NET_WITHDRAWAL = PRIVATE_GROSS_THRESHOLD;

export const TIME_ZONE = "Europe/Stockholm";

export const SALARY_STATUSES = ["ACCRUING", "READY", "PARTIALLY_PAID", "PAID"] as const;

export type SalaryStatus = (typeof SALARY_STATUSES)[number];
