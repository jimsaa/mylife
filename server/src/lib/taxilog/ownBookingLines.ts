import { CalculationError } from "./calculations/errors";
import { assertNonNegative, toMoney } from "./calculations/money";
import { parseIsoDate } from "./calculations/period";

export type TaxiOwnBookingLine = {
  bookingId: string;
  amount: string;
  date: string;
  driverId: string | null;
  recordedAt: string;
};

export type OwnBookingLineInput = {
  bookingId?: string;
  amount?: string | number;
  date?: string;
  driverId?: string | null;
  recordedAt?: string;
};

const BOOKING_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
const DRIVER_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function normalizeDriverId(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const driverId = value.trim();
  if (!driverId) return null;
  if (!DRIVER_ID.test(driverId)) {
    throw new CalculationError("INVALID_DRIVER", "Chaufförs-ID är ogiltigt.");
  }
  return driverId;
}

export function normalizeStoredOwnBookingLines(value: unknown): TaxiOwnBookingLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const line = item as Partial<TaxiOwnBookingLine>;
    if (typeof line.bookingId !== "string" || !BOOKING_ID.test(line.bookingId)) return [];
    if (typeof line.date !== "string") return [];
    try {
      parseIsoDate(line.date);
    } catch {
      return [];
    }
    if (typeof line.amount !== "string" && typeof line.amount !== "number") return [];
    let amount: string;
    try {
      amount = toMoney(assertNonNegative(line.amount, "Bokningsbelopp kan inte vara negativt.")).toFixed(2);
    } catch {
      return [];
    }
    let driverId: string | null = null;
    if (typeof line.driverId === "string" && line.driverId.trim()) {
      driverId = DRIVER_ID.test(line.driverId.trim()) ? line.driverId.trim() : null;
    }
    const recordedAt = typeof line.recordedAt === "string" && line.recordedAt ? line.recordedAt : `${line.date}T00:00:00.000Z`;
    return [{ bookingId: line.bookingId, amount, date: line.date, driverId, recordedAt }];
  });
}

export function applyOwnBookingLines(
  existing: TaxiOwnBookingLine[],
  input: { date: string; driverId?: string | null; ownBookingLines?: OwnBookingLineInput[] | null },
): TaxiOwnBookingLine[] {
  if (input.ownBookingLines == null) return existing;
  const driverId = normalizeDriverId(input.driverId);
  const incoming = input.ownBookingLines.map((line) => normalizeIncomingLine(line, input.date, driverId));
  const seen = new Set<string>();
  for (const line of incoming) {
    if (seen.has(line.bookingId)) {
      throw new CalculationError(
        "DUPLICATE_BOOKING_ID",
        `Boknings-ID ${line.bookingId} finns två gånger i samma sparning.`,
      );
    }
    seen.add(line.bookingId);
  }
  const kept = existing.filter((line) => !(line.date === input.date && line.driverId === driverId));
  for (const line of incoming) {
    const occupied = kept.find((item) => item.bookingId === line.bookingId);
    if (occupied) {
      throw new CalculationError(
        "DUPLICATE_BOOKING_ID",
        `Boknings-ID ${line.bookingId} finns redan på ${occupied.date} och kan inte sparas på en annan bokning.`,
      );
    }
  }
  return [...kept, ...incoming];
}

export function linesForDate(lines: TaxiOwnBookingLine[], date: string): TaxiOwnBookingLine[] {
  return lines.filter((line) => line.date === date);
}

export function findOwnBookingLine(lines: TaxiOwnBookingLine[], bookingId: string): TaxiOwnBookingLine | null {
  const id = bookingId.trim();
  if (!id) return null;
  return lines.find((line) => line.bookingId === id) ?? null;
}

function normalizeIncomingLine(
  line: OwnBookingLineInput,
  date: string,
  driverId: string | null,
): TaxiOwnBookingLine {
  const bookingId = typeof line.bookingId === "string" ? line.bookingId.trim() : "";
  if (!BOOKING_ID.test(bookingId)) {
    throw new CalculationError("INVALID_BOOKING_ID", "Boknings-ID ska vara ett enda ID, till exempel JS001.");
  }
  if (line.amount === undefined || line.amount === null || line.amount === "") {
    throw new CalculationError("MISSING_BOOKING_AMOUNT", `Belopp saknas för bokning ${bookingId}.`);
  }
  const amount = toMoney(assertNonNegative(line.amount, `Bokning ${bookingId} kan inte ha ett negativt belopp.`)).toFixed(2);
  const lineDate = line.date && line.date !== date ? line.date : date;
  if (lineDate !== date) {
    throw new CalculationError("BOOKING_DATE_MISMATCH", `Bokning ${bookingId} tillhör ett annat datum.`);
  }
  parseIsoDate(date);
  if (typeof line.recordedAt !== "string" || !line.recordedAt) {
    throw new CalculationError("MISSING_RECORDED_AT", `Registreringstid saknas för bokning ${bookingId}.`);
  }
  return { bookingId, amount, date, driverId, recordedAt: line.recordedAt };
}
