import { toDecimal, toMoney, type DecimalInput } from "../calculations/money";

export function normalizeUserNumber(value: string): string {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  return normalized === "" ? "0" : normalized;
}

export function formatSek(value: DecimalInput): string {
  const [whole, fraction] = toMoney(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (fraction === "00") {
    return `${grouped} kr`;
  }
  return `${grouped},${fraction} kr`;
}

export function formatHours(value: DecimalInput | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "0 h";
  }
  return `${toDecimal(value).toString()} h`;
}

export function formatKwh(value: DecimalInput | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "0 kWh";
  }
  return `${toDecimal(value).toString()} kWh`;
}

export function inputNumberValue(value: DecimalInput | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return toDecimal(value).toString();
}
