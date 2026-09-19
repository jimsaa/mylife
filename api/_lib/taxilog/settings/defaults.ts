/** Default VAT rate as a percent value. 6 means 6%. */
export const DEFAULT_VAT_RATE = "6";

/** Salary as a percent of income excluding VAT. 47 means 47%. */
export const DEFAULT_SALARY_RATE = "47";

export const TIME_ZONE = "Europe/Stockholm";

export const SALARY_STATUSES = ["ACCRUING", "READY", "PARTIALLY_PAID", "PAID"] as const;

export type SalaryStatus = (typeof SALARY_STATUSES)[number];
