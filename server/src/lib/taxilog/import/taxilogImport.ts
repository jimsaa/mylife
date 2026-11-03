import { CalculationError } from "../calculations/errors";
import { toMoney } from "../calculations/money";
import { parseIsoDate } from "../calculations/period";
import { exportDecimal } from "../export/format";
import { normalizeUserNumber } from "../format/display";

export const TAXILOG_DAILY_VERSION = "1";
export const TAXILOG_DAILY_VERSION_2 = "2";

export type TaxiLogDailyImport = {
  version: "1" | "2";
  date: string;
  grossIncome: string;
  ownBookings: string | null;
  otherIncome: string | null;
  tips: string;
  bonus: string;
  workedHours: string;
  chargingKwh: string;
};

function parseKeyValues(text: string): Map<string, string> {
  const values = new Map<string, string>();

  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line || line === "TAXILOG_IMPORT" || line === "END_TAXILOG_IMPORT") {
      continue;
    }
    if (line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    values.set(line.slice(0, separator).trim().toUpperCase(), line.slice(separator + 1).trim());
  }

  return values;
}

function readNumber(values: Map<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = values.get(key);
    if (value !== undefined && value !== "") {
      return normalizeUserNumber(value);
    }
  }
  return "0";
}

function readOptionalNumber(values: Map<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = values.get(key);
    if (value !== undefined && value !== "") {
      return normalizeUserNumber(value);
    }
  }
  return undefined;
}

function resolveIncomeSplit(grossIncome: string, ownRaw?: string, otherRaw?: string) {
  const gross = toMoney(grossIncome);
  if (ownRaw !== undefined && otherRaw !== undefined) {
    const own = toMoney(ownRaw);
    const other = toMoney(otherRaw);
    if (!own.plus(other).eq(gross)) {
      throw new CalculationError(
        "INCOME_SPLIT_MISMATCH",
        "OWN_BOOKINGS + OTHER_INCOME måste motsvara GROSS_INCOME.",
      );
    }
    return { ownBookings: own.toString(), otherIncome: other.toString() };
  }
  if (ownRaw !== undefined) {
    const own = toMoney(ownRaw);
    const other = toMoney(gross.minus(own));
    if (other.isNegative()) {
      throw new CalculationError("OWN_BOOKINGS_EXCEEDS_GROSS", "OWN_BOOKINGS kan inte överstiga GROSS_INCOME.");
    }
    return { ownBookings: own.toString(), otherIncome: other.toString() };
  }
  if (otherRaw !== undefined) {
    const other = toMoney(otherRaw);
    const own = toMoney(gross.minus(other));
    if (own.isNegative()) {
      throw new CalculationError("OTHER_INCOME_EXCEEDS_GROSS", "OTHER_INCOME kan inte överstiga GROSS_INCOME.");
    }
    return { ownBookings: own.toString(), otherIncome: other.toString() };
  }
  return { ownBookings: "0", otherIncome: gross.toString() };
}

export function parseTaxiLogImport(text: string): TaxiLogDailyImport {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized.includes("TAXILOG_IMPORT") || !normalized.includes("END_TAXILOG_IMPORT")) {
    throw new CalculationError(
      "INVALID_IMPORT",
      "Ogiltig import. Klistra in ett TAXILOG_IMPORT-block.",
    );
  }

  const values = parseKeyValues(normalized);
  const date = values.get("DATE");
  if (!date) {
    throw new CalculationError("MISSING_DATE", "DATE saknas i importen.");
  }
  parseIsoDate(date);

  const grossIncome = values.get("GROSS_INCOME") ?? values.get("TOTAL_INCOME");
  if (grossIncome === undefined || grossIncome === "") {
    throw new CalculationError("MISSING_INCOME", "GROSS_INCOME saknas i importen.");
  }

  const versionRaw = values.get("VERSION") ?? TAXILOG_DAILY_VERSION;
  const version = versionRaw === "2" ? "2" : "1";
  const ownRaw = readOptionalNumber(values, ["OWN_BOOKINGS"]);
  const otherRaw = readOptionalNumber(values, ["OTHER_INCOME"]);
  const split = resolveIncomeSplit(normalizeUserNumber(grossIncome), ownRaw, otherRaw);

  return {
    version,
    date,
    grossIncome: normalizeUserNumber(grossIncome),
    ownBookings: split.ownBookings,
    otherIncome: split.otherIncome,
    tips: readNumber(values, ["TIPS"]),
    bonus: readNumber(values, ["BONUS"]),
    workedHours: readNumber(values, ["WORKED_HOURS", "WORK_HOURS"]),
    chargingKwh: readNumber(values, ["CHARGING_KWH"]),
  };
}

function isPresentAmount(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value !== "" && value !== "0";
}

export function formatDailyExport(input: TaxiLogDailyImport): string {
  const hasV2Fields = isPresentAmount(input.ownBookings) || isPresentAmount(input.bonus);
  const version = input.version === "2" || hasV2Fields ? "2" : "1";
  if (version === "1") {
    return [
      "TAXILOG_IMPORT",
      `VERSION=${TAXILOG_DAILY_VERSION}`,
      `DATE=${input.date}`,
      "",
      `GROSS_INCOME=${exportDecimal(input.grossIncome)}`,
      `TIPS=${exportDecimal(input.tips)}`,
      `WORKED_HOURS=${exportDecimal(input.workedHours)}`,
      `CHARGING_KWH=${exportDecimal(input.chargingKwh)}`,
      "",
      "END_TAXILOG_IMPORT",
    ].join("\n");
  }

  return [
    "TAXILOG_IMPORT",
    `VERSION=${TAXILOG_DAILY_VERSION_2}`,
    `DATE=${input.date}`,
    "",
    `GROSS_INCOME=${exportDecimal(input.grossIncome)}`,
    `OWN_BOOKINGS=${exportDecimal(input.ownBookings ?? "0")}`,
    `OTHER_INCOME=${exportDecimal(input.otherIncome ?? input.grossIncome)}`,
    `TIPS=${exportDecimal(input.tips)}`,
    `BONUS=${exportDecimal(input.bonus)}`,
    `WORKED_HOURS=${exportDecimal(input.workedHours)}`,
    `CHARGING_KWH=${exportDecimal(input.chargingKwh)}`,
    "",
    "END_TAXILOG_IMPORT",
  ].join("\n");
}
