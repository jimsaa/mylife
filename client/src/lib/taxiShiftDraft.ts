export const TAXI_SHIFT_DRAFT_KEY = 'mylife.taxiShiftDraft.v1';

export const TAXI_SHIFT_CATEGORIES = [
  { id: 'ownBookings', label: 'Egen Kund', field: 'OWN_BOOKINGS', driving: true },
  { id: 'uberIncome', label: 'Uber', field: 'UBER_INCOME', driving: true },
  { id: 'boltIncome', label: 'Bolt', field: 'BOLT_INCOME', driving: true },
  { id: 'handUp', label: 'H-Up', field: 'HAND_UP', driving: true },
  { id: 'tips', label: 'Dricks', field: 'TIPS', driving: false },
  { id: 'bonus', label: 'Bonusar', field: 'BONUS', driving: false },
] as const;

export type TaxiShiftCategoryId = (typeof TAXI_SHIFT_CATEGORIES)[number]['id'];

export type TaxiShiftEntry = {
  id: string;
  categoryId: TaxiShiftCategoryId;
  amount: string;
  recordedAt: string;
  bookingIds?: string;
};

export type TaxiShiftBreak = {
  id: string;
  startedAt: string;
  endedAt: string | null;
};

export type TaxiShiftDraft = {
  version: 1;
  startedAt: string | null;
  endedAt: string | null;
  entries: TaxiShiftEntry[];
  breaks: TaxiShiftBreak[];
};

export type ReportedWorkTime = {
  shiftMs: number;
  breakMs: number;
  reportedMs: number;
};

type KeyValueStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const CATEGORY_IDS = new Set<string>(TAXI_SHIFT_CATEGORIES.map((category) => category.id));

export function emptyTaxiShiftDraft(): TaxiShiftDraft {
  return { version: 1, startedAt: null, endedAt: null, entries: [], breaks: [] };
}

export function parseShiftAmount(raw: string): string | null {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const negative = trimmed.startsWith('-');
  const [whole, fraction = ''] = trimmed.slice(negative ? 1 : 0).split('.');
  const ore = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(ore)) return null;
  return fromOre(negative ? -ore : ore);
}

export type ShiftAmountKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | 'backspace' | 'clear' | 'sign';

export function editShiftAmountInput(current: string, key: ShiftAmountKey): string {
  if (key === 'clear') return '';
  if (key === 'backspace') {
    const next = current.slice(0, -1);
    return next === '-' ? '' : next;
  }
  if (key === 'sign') {
    if (current.startsWith('-')) return current.slice(1);
    return current === '' ? '-' : `-${current}`;
  }

  const negative = current.startsWith('-');
  const body = negative ? current.slice(1) : current;
  const withSign = (nextBody: string) => (negative && nextBody === '' ? '-' : `${negative ? '-' : ''}${nextBody}`);

  if (key === ',') {
    if (body.includes(',')) return current;
    return withSign(`${body === '' ? '0' : body},`);
  }

  const [whole, fraction = ''] = body.split(',');
  if (body.includes(',')) {
    if (fraction.length >= 2) return current;
    return withSign(`${body}${key}`);
  }
  if (whole === '0') return withSign(key);
  if (whole.length >= 9) return current;
  return withSign(`${body}${key}`);
}

export function categorySum(draft: TaxiShiftDraft, categoryId: TaxiShiftCategoryId): string {
  const ore = draft.entries
    .filter((entry) => entry.categoryId === categoryId)
    .reduce((sum, entry) => sum + toOre(entry.amount), 0);
  return fromOre(ore);
}

export function drivingGross(draft: TaxiShiftDraft): string {
  const ore = TAXI_SHIFT_CATEGORIES.filter((category) => category.driving).reduce(
    (sum, category) => sum + toOre(categorySum(draft, category.id)),
    0,
  );
  return fromOre(ore);
}

export function cashTotal(draft: TaxiShiftDraft): string {
  const ore = TAXI_SHIFT_CATEGORIES.reduce((sum, category) => sum + toOre(categorySum(draft, category.id)), 0);
  return fromOre(ore);
}

/** Category sum divided by the six-category cash total, as a percent. Zero cash is 0. */
export function categorySharePercent(draft: TaxiShiftDraft, categoryId: TaxiShiftCategoryId): string {
  const total = toOre(cashTotal(draft));
  if (total === 0) return '0';
  const scaled = (toOre(categorySum(draft, categoryId)) * 1000) / total;
  if (!Number.isFinite(scaled)) return '0';
  const tenths = Math.sign(scaled) * Math.round(Math.abs(scaled));
  const sign = tenths < 0 ? '-' : '';
  const absolute = Math.abs(tenths);
  const whole = Math.trunc(absolute / 10);
  const decimal = absolute % 10;
  return decimal === 0 ? `${sign}${whole}` : `${sign}${whole},${decimal}`;
}

export function startShift(draft: TaxiShiftDraft, startedAt: string): TaxiShiftDraft {
  if (draft.startedAt) return draft;
  return { ...draft, startedAt };
}

export function setShiftStart(draft: TaxiShiftDraft, startedAt: string): TaxiShiftDraft {
  return { ...draft, startedAt };
}

export function endShift(draft: TaxiShiftDraft, endedAt: string): TaxiShiftDraft {
  if (!draft.startedAt || draft.endedAt) return draft;
  return setShiftEnd(draft, endedAt);
}

export function setShiftEnd(draft: TaxiShiftDraft, endedAt: string | null): TaxiShiftDraft {
  if (!endedAt) return { ...draft, endedAt: null };
  const breaks = draft.endedAt ? draft.breaks : closeOpenBreaks(draft.breaks, endedAt);
  return { ...draft, endedAt, breaks };
}

export function hasOpenBreak(draft: TaxiShiftDraft): boolean {
  return draft.breaks.some((item) => item.endedAt == null);
}

export function startBreak(draft: TaxiShiftDraft, item: TaxiShiftBreak): TaxiShiftDraft {
  if (!draft.startedAt || draft.endedAt || item.endedAt || hasOpenBreak(draft)) return draft;
  return { ...draft, breaks: [...draft.breaks, item] };
}

export function resumeBreak(draft: TaxiShiftDraft, endedAt: string): TaxiShiftDraft {
  if (!hasOpenBreak(draft)) return draft;
  return { ...draft, breaks: closeOpenBreaks(draft.breaks, endedAt) };
}

export function addBreak(draft: TaxiShiftDraft, item: TaxiShiftBreak): TaxiShiftDraft {
  return { ...draft, breaks: [...draft.breaks, item] };
}

export function updateBreak(
  draft: TaxiShiftDraft,
  breakId: string,
  next: { startedAt?: string; endedAt?: string | null },
): TaxiShiftDraft {
  if (next.endedAt === null && draft.breaks.some((item) => item.id !== breakId && item.endedAt == null)) {
    return draft;
  }
  return {
    ...draft,
    breaks: draft.breaks.map((item) => (item.id === breakId ? { ...item, ...next } : item)),
  };
}

export function removeBreak(draft: TaxiShiftDraft, breakId: string): TaxiShiftDraft {
  return { ...draft, breaks: draft.breaks.filter((item) => item.id !== breakId) };
}

export function calculateReportedWork(draft: TaxiShiftDraft, nowIso: string): ReportedWorkTime {
  const empty = { shiftMs: 0, breakMs: 0, reportedMs: 0 };
  const shiftStart = timeMs(draft.startedAt);
  if (shiftStart == null) return empty;
  const shiftEnd = timeMs(draft.endedAt) ?? timeMs(nowIso);
  if (shiftEnd == null || shiftEnd <= shiftStart) return empty;
  const shiftMs = shiftEnd - shiftStart;
  const intervals = draft.breaks.flatMap((item) => {
    const start = timeMs(item.startedAt);
    const end = timeMs(item.endedAt) ?? (draft.endedAt ? timeMs(draft.endedAt) : timeMs(nowIso));
    if (start == null || end == null) return [];
    const clipped = clipInterval(start, end, shiftStart, shiftEnd);
    return clipped ? [clipped] : [];
  });
  const breakMs = mergedDuration(intervals);
  return {
    shiftMs,
    breakMs,
    reportedMs: Math.max(0, shiftMs - breakMs),
  };
}

export function formatWorkDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 min';
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

export function instantToStockholmInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = stockholmParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function normalizeStockholmDate(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1] ?? '';
}

export function normalizeStockholmTime(value: string): string {
  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : '';
}

export function stockholmFieldsToInstant(date: string, time: string): string | null {
  const day = normalizeStockholmDate(date);
  const clock = normalizeStockholmTime(time);
  if (!day || !clock) return null;
  return stockholmInputToInstant(`${day}T${clock}`);
}

export function stockholmInputToInstant(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const wallClock = Date.UTC(year, month - 1, day, hour, minute);
  const firstOffset = stockholmOffsetMinutes(new Date(wallClock));
  const firstUtc = wallClock - firstOffset * 60_000;
  const offset = stockholmOffsetMinutes(new Date(firstUtc));
  return new Date(wallClock - offset * 60_000).toISOString();
}

export function parseBookingIds(raw: string): string | null {
  const ids = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (ids.length === 0) return null;
  if (ids.length > 20 || ids.some((id) => !/^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/.test(id))) return null;
  return ids.join(', ');
}

export function addShiftEntry(
  draft: TaxiShiftDraft,
  entry: TaxiShiftEntry,
): TaxiShiftDraft {
  return { ...draft, entries: [...draft.entries, entryWithBookingIds(entry)] };
}

export function updateShiftEntry(
  draft: TaxiShiftDraft,
  entryId: string,
  amount: string,
  bookingIds?: string | null,
): TaxiShiftDraft {
  return {
    ...draft,
    entries: draft.entries.map((entry) => {
      if (entry.id !== entryId) return entry;
      return entryWithBookingIds({
        ...entry,
        amount,
        bookingIds: bookingIds === undefined ? entry.bookingIds : bookingIds ?? undefined,
      });
    }),
  };
}

export function removeShiftEntry(draft: TaxiShiftDraft, entryId: string): TaxiShiftDraft {
  return { ...draft, entries: draft.entries.filter((entry) => entry.id !== entryId) };
}

export function loadTaxiShiftDraft(storage: KeyValueStorage): TaxiShiftDraft {
  const raw = storage.getItem(TAXI_SHIFT_DRAFT_KEY);
  if (!raw) return emptyTaxiShiftDraft();
  try {
    return normalizeDraft(JSON.parse(raw));
  } catch {
    return emptyTaxiShiftDraft();
  }
}

export function saveTaxiShiftDraft(storage: KeyValueStorage, draft: TaxiShiftDraft): void {
  storage.setItem(TAXI_SHIFT_DRAFT_KEY, JSON.stringify(draft));
}

function normalizeDraft(value: unknown): TaxiShiftDraft {
  if (!value || typeof value !== 'object') return emptyTaxiShiftDraft();
  const record = value as Partial<TaxiShiftDraft>;
  const entries = Array.isArray(record.entries) ? record.entries.flatMap(normalizeEntry) : [];
  const breaks = Array.isArray(record.breaks) ? record.breaks.flatMap(normalizeBreak) : [];
  return {
    version: 1,
    startedAt: typeof record.startedAt === 'string' && record.startedAt ? record.startedAt : null,
    endedAt: typeof record.endedAt === 'string' && record.endedAt ? record.endedAt : null,
    entries,
    breaks,
  };
}

function normalizeEntry(value: unknown): TaxiShiftEntry[] {
  if (!value || typeof value !== 'object') return [];
  const entry = value as Partial<TaxiShiftEntry>;
  if (typeof entry.id !== 'string' || !entry.id) return [];
  if (typeof entry.categoryId !== 'string' || !CATEGORY_IDS.has(entry.categoryId)) return [];
  if (typeof entry.amount !== 'string' || parseShiftAmount(entry.amount) !== entry.amount) return [];
  if (typeof entry.recordedAt !== 'string' || !entry.recordedAt) return [];
  return [
    entryWithBookingIds({
      id: entry.id,
      categoryId: entry.categoryId as TaxiShiftCategoryId,
      amount: entry.amount,
      recordedAt: entry.recordedAt,
      bookingIds: typeof entry.bookingIds === 'string' ? entry.bookingIds : undefined,
    }),
  ];
}

function entryWithBookingIds(entry: TaxiShiftEntry): TaxiShiftEntry {
  const next: TaxiShiftEntry = {
    id: entry.id,
    categoryId: entry.categoryId,
    amount: entry.amount,
    recordedAt: entry.recordedAt,
  };
  if (entry.categoryId !== 'ownBookings' || !entry.bookingIds) return next;
  const bookingIds = parseBookingIds(entry.bookingIds);
  return bookingIds ? { ...next, bookingIds } : next;
}

function closeOpenBreaks(breaks: TaxiShiftBreak[], endedAt: string): TaxiShiftBreak[] {
  return breaks.map((item) => (item.endedAt ? item : { ...item, endedAt }));
}

function timeMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function clipInterval(
  start: number,
  end: number,
  windowStart: number,
  windowEnd: number,
): [number, number] | null {
  const clippedStart = Math.max(start, windowStart);
  const clippedEnd = Math.min(end, windowEnd);
  return clippedEnd > clippedStart ? [clippedStart, clippedEnd] : null;
}

function mergedDuration(intervals: Array<[number, number]>): number {
  const sorted = [...intervals].sort((left, right) => left[0] - right[0]);
  let total = 0;
  let current: [number, number] | null = null;
  for (const interval of sorted) {
    if (!current || interval[0] > current[1]) {
      if (current) total += current[1] - current[0];
      current = interval;
      continue;
    }
    current = [current[0], Math.max(current[1], interval[1])];
  }
  if (current) total += current[1] - current[0];
  return Number.isFinite(total) && total > 0 ? total : 0;
}

function normalizeBreak(value: unknown): TaxiShiftBreak[] {
  if (!value || typeof value !== 'object') return [];
  const item = value as Partial<TaxiShiftBreak>;
  if (typeof item.id !== 'string' || !item.id) return [];
  if (typeof item.startedAt !== 'string' || timeMs(item.startedAt) == null) return [];
  const endedAt = typeof item.endedAt === 'string' && timeMs(item.endedAt) != null ? item.endedAt : null;
  return [{ id: item.id, startedAt: item.startedAt, endedAt }];
}

function stockholmParts(date: Date): Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Stockholm',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const read = (type: 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second') =>
    parts.find((part) => part.type === type)?.value ?? '00';
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

function stockholmOffsetMinutes(date: Date): number {
  const parts = stockholmParts(date);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - date.getTime()) / 60_000);
}

function toOre(amount: string): number {
  const negative = amount.startsWith('-');
  const [whole, fraction = '00'] = amount.slice(negative ? 1 : 0).split('.');
  const ore = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
  return negative ? -ore : ore;
}

function fromOre(ore: number): string {
  const sign = ore < 0 ? '-' : '';
  const absolute = Math.abs(ore);
  const whole = Math.floor(absolute / 100);
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${sign}${whole}.${fraction}`;
}
