import { CalculationError } from "../calculations/errors";
import { parseIsoDate } from "../calculations/period";
import { exportDecimal } from "../export/format";
import { normalizeUserNumber } from "../format/display";

export const TAXILOG_DAILY_VERSION = "1";

export type TaxiLogDailyImport = {
  date: string;
  grossIncome: string;
  tips: string;
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

  return {
    date,
    grossIncome: normalizeUserNumber(grossIncome),
    tips: readNumber(values, ["TIPS"]),
    workedHours: readNumber(values, ["WORKED_HOURS", "WORK_HOURS"]),
    chargingKwh: readNumber(values, ["CHARGING_KWH"]),
  };
}

export function formatDailyExport(input: TaxiLogDailyImport): string {
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
