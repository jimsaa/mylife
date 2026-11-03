import { CalculationError } from "../calculations/errors";
import { sumDrivingGross, sumTotalIncome } from "../calculations/incomeSources";
import { assertNonNegative, toMoney } from "../calculations/money";
import { parseIsoDate } from "../calculations/period";
import { exportDecimal } from "../export/format";
import { normalizeUserNumber } from "../format/display";

export const TAXILOG_DAILY_VERSION = "1";
export const TAXILOG_DAILY_VERSION_2 = "2";
export const TAXILOG_DAILY_VERSION_3 = "3";

export const TAXILOG_V3_TEMPLATE = `TAXILOG_IMPORT
VERSION=3
DATE=2026-11-03

OWN_BOOKINGS=0
HAND_UP=0
UBER_INCOME=0
BOLT_INCOME=0

BONUS=0
TIPS=0

WORKED_HOURS=0

END_TAXILOG_IMPORT`;

export type TaxiLogDailyImport = {
  version: "1" | "2" | "3";
  date: string;
  grossIncome: string;
  ownBookings: string | null;
  otherIncome: string | null;
  handUp: string | null;
  uberIncome: string | null;
  boltIncome: string | null;
  tips: string;
  bonus: string;
  workedHours: string;
  chargingKwh?: string;
  totalIncome: string;
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

function readRequiredAmount(values: Map<string, string>, key: string): string {
  if (!values.has(key)) {
    throw new CalculationError("MISSING_FIELD", `${key} saknas i importen.`);
  }
  const raw = values.get(key) ?? "";
  if (raw === "") {
    throw new CalculationError("EMPTY_FIELD", `${key} får inte vara tomt.`);
  }
  const normalized = normalizeUserNumber(raw);
  return toMoney(assertNonNegative(normalized, `${key} kan inte vara negativt.`)).toString();
}

function readRequiredHours(values: Map<string, string>, key: string): string {
  if (!values.has(key)) {
    throw new CalculationError("MISSING_FIELD", `${key} saknas i importen.`);
  }
  const raw = values.get(key) ?? "";
  if (raw === "") {
    throw new CalculationError("EMPTY_FIELD", `${key} får inte vara tomt.`);
  }
  const normalized = normalizeUserNumber(raw);
  return assertNonNegative(normalized, `${key} kan inte vara negativt.`).toString();
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

function parseLegacyImport(values: Map<string, string>, version: "1" | "2", date: string): TaxiLogDailyImport {
  const grossIncome = values.get("GROSS_INCOME") ?? values.get("TOTAL_INCOME");
  if (grossIncome === undefined || grossIncome === "") {
    throw new CalculationError("MISSING_INCOME", "GROSS_INCOME saknas i importen.");
  }

  const ownRaw = readOptionalNumber(values, ["OWN_BOOKINGS"]);
  const otherRaw = readOptionalNumber(values, ["OTHER_INCOME"]);
  const split = resolveIncomeSplit(normalizeUserNumber(grossIncome), ownRaw, otherRaw);
  const tips = readNumber(values, ["TIPS"]);
  const bonus = readNumber(values, ["BONUS"]);
  const parsedGross = toMoney(normalizeUserNumber(grossIncome)).toString();
  const totals = sumTotalIncome(parsedGross, bonus, tips);

  return {
    version,
    date,
    grossIncome: parsedGross,
    ownBookings: split.ownBookings,
    otherIncome: split.otherIncome,
    handUp: null,
    uberIncome: null,
    boltIncome: null,
    tips,
    bonus,
    workedHours: readNumber(values, ["WORKED_HOURS", "WORK_HOURS"]),
    chargingKwh: readNumber(values, ["CHARGING_KWH"]),
    totalIncome: totals.totalIncome.toString(),
  };
}

function parseVersion3Import(values: Map<string, string>, date: string): TaxiLogDailyImport {
  const ownBookings = readRequiredAmount(values, "OWN_BOOKINGS");
  const handUp = readRequiredAmount(values, "HAND_UP");
  const uberIncome = readRequiredAmount(values, "UBER_INCOME");
  const boltIncome = readRequiredAmount(values, "BOLT_INCOME");
  const bonus = readRequiredAmount(values, "BONUS");
  const tips = readRequiredAmount(values, "TIPS");
  const workedHours = readRequiredHours(values, "WORKED_HOURS");
  const driving = sumDrivingGross({ ownBookings, handUp, uberIncome, boltIncome });
  const totals = sumTotalIncome(driving.grossIncome, bonus, tips);

  const declaredGross = readOptionalNumber(values, ["GROSS_INCOME", "TOTAL_INCOME"]);
  if (declaredGross !== undefined && !toMoney(declaredGross).eq(driving.grossIncome)) {
    throw new CalculationError(
      "GROSS_INCOME_MISMATCH",
      "GROSS_INCOME måste motsvara OWN_BOOKINGS + HAND_UP + UBER_INCOME + BOLT_INCOME.",
    );
  }

  return {
    version: "3",
    date,
    grossIncome: driving.grossIncome.toString(),
    ownBookings: driving.ownBookings.toString(),
    otherIncome: null,
    handUp: driving.handUp.toString(),
    uberIncome: driving.uberIncome.toString(),
    boltIncome: driving.boltIncome.toString(),
    tips: totals.tips.toString(),
    bonus: totals.bonus.toString(),
    workedHours,
    totalIncome: totals.totalIncome.toString(),
  };
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

  const versionRaw = values.get("VERSION") ?? TAXILOG_DAILY_VERSION;
  if (versionRaw === "3") {
    return parseVersion3Import(values, date);
  }
  return parseLegacyImport(values, versionRaw === "2" ? "2" : "1", date);
}

function isPresentAmount(value: string | null | undefined): boolean {
  return value !== null && value !== undefined && value !== "" && value !== "0";
}

export function formatDailyExport(input: Partial<TaxiLogDailyImport> & {
  date: string;
  grossIncome: string;
  tips: string;
  workedHours: string;
}): string {
  const hasV3Fields =
    input.version === "3" ||
    isPresentAmount(input.handUp) ||
    isPresentAmount(input.uberIncome) ||
    isPresentAmount(input.boltIncome);
  if (hasV3Fields) {
    const driving = sumDrivingGross({
      ownBookings: input.ownBookings ?? "0",
      handUp: input.handUp ?? "0",
      uberIncome: input.uberIncome ?? "0",
      boltIncome: input.boltIncome ?? "0",
    });
    return [
      "TAXILOG_IMPORT",
      `VERSION=${TAXILOG_DAILY_VERSION_3}`,
      `DATE=${input.date}`,
      "",
      `OWN_BOOKINGS=${exportDecimal(driving.ownBookings)}`,
      `HAND_UP=${exportDecimal(driving.handUp)}`,
      `UBER_INCOME=${exportDecimal(driving.uberIncome)}`,
      `BOLT_INCOME=${exportDecimal(driving.boltIncome)}`,
      "",
      `BONUS=${exportDecimal(input.bonus ?? "0")}`,
      `TIPS=${exportDecimal(input.tips)}`,
      "",
      `WORKED_HOURS=${exportDecimal(input.workedHours)}`,
      "",
      "END_TAXILOG_IMPORT",
    ].join("\n");
  }

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
      `CHARGING_KWH=${exportDecimal(input.chargingKwh ?? "0")}`,
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
    `CHARGING_KWH=${exportDecimal(input.chargingKwh ?? "0")}`,
    "",
    "END_TAXILOG_IMPORT",
  ].join("\n");
}
