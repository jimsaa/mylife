import { toDecimal, type DecimalInput } from "../calculations/money";

export function exportDecimal(value: DecimalInput | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  return toDecimal(value).toString();
}

export function exportLines(rows: Array<[string, string]>): string {
  return rows.map(([key, value]) => `${key}=${value}`).join("\n");
}
