const SWEDISH_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  mars: 3,
  april: 4,
  maj: 5,
  juni: 6,
  juli: 7,
  augusti: 8,
  september: 9,
  oktober: 10,
  november: 11,
  december: 12,
};

/** Parse duration strings like "8 h 33 m", "52 min", "1 h 25 m" into minutes. */
export function parseDurationToMinutes(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' && !Number.isNaN(raw)) return Math.round(raw);

  const text = String(raw).trim().toLowerCase();
  if (!text) return null;

  const hoursMinutes = text.match(/(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?/i);
  if (hoursMinutes) {
    return parseInt(hoursMinutes[1], 10) * 60 + parseInt(hoursMinutes[2], 10);
  }

  const hoursOnly = text.match(/(\d+)\s*h(?:ours?)?(?:\s|$)/i);
  if (hoursOnly && !text.includes('min')) {
    return parseInt(hoursOnly[1], 10) * 60;
  }

  const minutesOnly = text.match(/(\d+)\s*m(?:in(?:utes?)?)?(?:\s|$)/i);
  if (minutesOnly) {
    return parseInt(minutesOnly[1], 10);
  }

  const decimalHours = text.match(/^(\d+[.,]\d+)\s*h?$/);
  if (decimalHours) {
    return Math.round(parseFloat(decimalHours[1].replace(',', '.')) * 60);
  }

  return null;
}

/** Parse dates in many formats to ISO YYYY-MM-DD. */
export function parseDateToIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const isoSlash = text.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (isoSlash) {
    return `${isoSlash[1]}-${isoSlash[2].padStart(2, '0')}-${isoSlash[3].padStart(2, '0')}`;
  }

  const dmySlash = text.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (dmySlash) {
    const day = dmySlash[1].padStart(2, '0');
    const month = dmySlash[2].padStart(2, '0');
    let year = dmySlash[3] ?? String(new Date().getFullYear());
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }

  const swedish = text.match(/(\d{1,2})\s+([a-zåäö]+)\s+(\d{4})/i);
  if (swedish) {
    const monthName = swedish[2].toLowerCase();
    const month = SWEDISH_MONTHS[monthName];
    if (month) {
      return `${swedish[3]}-${String(month).padStart(2, '0')}-${swedish[1].padStart(2, '0')}`;
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

/** Normalize HH:MM time strings. */
export function parseTimeValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = String(raw).trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

export function parsePercent(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return raw;
  const match = String(raw).match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (match) return parseFloat(match[1].replace(',', '.'));
  const num = parseFloat(String(raw).replace(',', '.'));
  return Number.isNaN(num) ? null : num;
}

export function parseInteger(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Math.round(raw);
  const match = String(raw).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export function parseBoolean(raw: unknown): boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'boolean') return raw;
  const text = String(raw).toLowerCase();
  if (['true', 'yes', 'detected', 'upptäckt', 'ja'].some((v) => text.includes(v))) return true;
  if (['false', 'no', 'nej', 'none'].some((v) => text.includes(v))) return false;
  return null;
}

export function minutesToHoursDecimal(minutes: number | null | undefined): number | null {
  if (minutes === null || minutes === undefined) return null;
  return Math.round((minutes / 60) * 100) / 100;
}
