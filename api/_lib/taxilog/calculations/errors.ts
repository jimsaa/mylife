export class CalculationError extends Error {
  readonly code: string;
  readonly messageSv: string;

  constructor(code: string, messageSv: string) {
    super(messageSv);
    this.name = "CalculationError";
    this.code = code;
    this.messageSv = messageSv;
  }
}
