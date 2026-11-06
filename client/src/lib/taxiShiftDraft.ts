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
  bookingId?: string;
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
  closedAt: string | null;
  closedDate: string | null;
  correctingDate: string | null;
  workDate: string | null;
  loadedWorkedHours: string | null;
  historicalEditable: boolean;
  openedFingerprint: string | null;
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
  return {
    version: 1,
    startedAt: null,
    endedAt: null,
    entries: [],
    breaks: [],
    closedAt: null,
    closedDate: null,
    correctingDate: null,
    workDate: null,
    loadedWorkedHours: null,
    historicalEditable: false,
    openedFingerprint: null,
  };
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

export function reportedHoursValue(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0.00';
  const minutes = Math.round(ms / 60_000);
  const scaled = Math.round((minutes * 100) / 60);
  const whole = Math.floor(scaled / 100);
  const fraction = String(scaled % 100).padStart(2, '0');
  return `${whole}.${fraction}`;
}

export type ShiftClosePlan = {
  date: string;
  text: string;
  workedHours: string;
};

export function planShiftClose(
  draft: TaxiShiftDraft,
  nowIso: string,
): { ok: true; plan: ShiftClosePlan } | { ok: false; reason: string } {
  if (!draft.startedAt) return { ok: false, reason: 'Startdatum och starttid saknas.' };
  if (!draft.endedAt) return { ok: false, reason: 'Sluttid saknas.' };
  const work = calculateReportedWork(draft, nowIso);
  if (work.shiftMs <= 0) return { ok: false, reason: 'Sluttiden måste vara efter starttiden.' };
  const negative = TAXI_SHIFT_CATEGORIES.find((category) => categorySum(draft, category.id).startsWith('-'));
  if (negative) return { ok: false, reason: `${negative.label} kan inte vara negativ när dagen sparas.` };
  const date = instantToStockholmInput(draft.startedAt).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, reason: 'Startdatum är ogiltigt.' };
  const workedHours = reportedHoursValue(work.reportedMs);
  const amount = (field: string, categoryId: TaxiShiftCategoryId) => `${field}=${categorySum(draft, categoryId)}`;
  const text = [
    'TAXILOG_IMPORT',
    'VERSION=3',
    `DATE=${date}`,
    '',
    amount('OWN_BOOKINGS', 'ownBookings'),
    amount('HAND_UP', 'handUp'),
    amount('UBER_INCOME', 'uberIncome'),
    amount('BOLT_INCOME', 'boltIncome'),
    '',
    amount('BONUS', 'bonus'),
    amount('TIPS', 'tips'),
    '',
    `WORKED_HOURS=${workedHours}`,
    '',
    'END_TAXILOG_IMPORT',
  ].join('\n');
  return { ok: true, plan: { date, text, workedHours } };
}

export type SavedShiftDay = {
  date: string;
  grossIncome?: string | null;
  ownBookings?: string | null;
  handUp?: string | null;
  uberIncome?: string | null;
  boltIncome?: string | null;
  tips?: string | null;
  bonus?: string | null;
  workedHours?: string | null;
  sourceCategorized?: boolean;
  ownBookingLines?: Array<{ bookingId: string; amount: string; recordedAt?: string; driverId?: string | null }>;
  corrections?: Array<{ correctedAt: string; changes: { field: string; before: string; after: string }[] }>;
  fingerprint?: string;
};

export function draftFromSavedDay(day: SavedShiftDay, nowIso: string): TaxiShiftDraft {
  const categorized = day.sourceCategorized === true;
  const entries: TaxiShiftEntry[] = [];
  if (categorized) {
    const lines = (day.ownBookingLines ?? []).filter((line) => line.driverId == null);
    let lineOre = 0;
    for (const line of lines) {
      const amount = parseShiftAmount(line.amount);
      if (!amount || !line.bookingId) continue;
      lineOre += toOre(amount);
      entries.push({
        id: `booking-${line.bookingId}`,
        categoryId: 'ownBookings',
        amount,
        recordedAt: line.recordedAt || nowIso,
        bookingId: line.bookingId,
      });
    }
    const target = toOre(parseShiftAmount(day.ownBookings ?? '0') ?? '0.00');
    if (target !== lineOre) {
      entries.push({
        id: 'own-unspecified',
        categoryId: 'ownBookings',
        amount: fromOre(target - lineOre),
        recordedAt: nowIso,
      });
    }
    const categories: Array<[TaxiShiftCategoryId, string | null | undefined]> = [
      ['uberIncome', day.uberIncome],
      ['boltIncome', day.boltIncome],
      ['handUp', day.handUp],
      ['tips', day.tips],
      ['bonus', day.bonus],
    ];
    for (const [categoryId, value] of categories) {
      const amount = parseShiftAmount(value ?? '0');
      if (!amount || toOre(amount) === 0) continue;
      entries.push({
        id: `saved-${categoryId}`,
        categoryId,
        amount,
        recordedAt: nowIso,
      });
    }
  }
  return {
    ...emptyTaxiShiftDraft(),
    entries,
    correctingDate: day.date,
    workDate: day.date,
    loadedWorkedHours: day.workedHours ?? null,
    historicalEditable: categorized,
    openedFingerprint: day.fingerprint ?? null,
  };
}

export function applySavedDayLoad(
  draft: TaxiShiftDraft,
  result: { ok: false } | { ok: true; day: SavedShiftDay | null },
  nowIso: string,
): { draft: TaxiShiftDraft; opened: boolean; error: string | null } {
  if (!result.ok) {
    return { draft, opened: false, error: 'Kunde inte hämta dagen. Ingenting ändrades.' };
  }
  if (!result.day) {
    return { draft, opened: false, error: 'Datumet har ingen sparad dag. Ingenting ändrades.' };
  }
  return { draft: draftFromSavedDay(result.day, nowIso), opened: true, error: null };
}

export function historicalCorrectionPlan(
  draft: TaxiShiftDraft,
  nowIso: string,
): { ok: true; plan: ShiftClosePlan } | { ok: false; reason: string } {
  if (!draft.correctingDate) return { ok: false, reason: 'Ingen sparad dag är öppnad.' };
  if (!draft.historicalEditable) {
    return { ok: false, reason: 'Dagen är inte uppdelad på de sex intäktskällorna och kan inte ändras här.' };
  }
  const date = draft.correctingDate;
  if (draft.startedAt) {
    const startDate = stockholmCalendarDate(draft.startedAt);
    if (startDate !== date) {
      return { ok: false, reason: `Korrigeringen gäller ${date} och kan inte sparas på ${startDate}.` };
    }
  }
  let workedHours = draft.loadedWorkedHours && draft.loadedWorkedHours.trim() ? draft.loadedWorkedHours : '0.00';
  if (draft.startedAt && draft.endedAt) {
    const reported = calculateReportedWork(draft, nowIso);
    if (reported.shiftMs <= 0) return { ok: false, reason: 'Sluttiden måste vara efter starttiden.' };
    workedHours = reportedHoursValue(reported.reportedMs);
  }
  const negative = TAXI_SHIFT_CATEGORIES.find((category) => categorySum(draft, category.id).startsWith('-'));
  if (negative) return { ok: false, reason: `${negative.label} kan inte vara negativ när dagen sparas.` };
  const amount = (field: string, categoryId: TaxiShiftCategoryId) => `${field}=${categorySum(draft, categoryId)}`;
  const text = [
    'TAXILOG_IMPORT',
    'VERSION=3',
    `DATE=${date}`,
    '',
    amount('OWN_BOOKINGS', 'ownBookings'),
    amount('HAND_UP', 'handUp'),
    amount('UBER_INCOME', 'uberIncome'),
    amount('BOLT_INCOME', 'boltIncome'),
    '',
    amount('BONUS', 'bonus'),
    amount('TIPS', 'tips'),
    '',
    `WORKED_HOURS=${workedHours}`,
    '',
    'END_TAXILOG_IMPORT',
  ].join('\n');
  return { ok: true, plan: { date, text, workedHours } };
}

export function commitHistoricalCorrection(
  draft: TaxiShiftDraft,
  result: { ok: false; message: string } | { ok: true },
): { draft: TaxiShiftDraft; saved: boolean; error: string | null } {
  if (!result.ok) return { draft, saved: false, error: result.message };
  return { draft, saved: true, error: null };
}

export function markShiftClosed(draft: TaxiShiftDraft, closedAt: string, closedDate: string): TaxiShiftDraft {
  return { ...draft, closedAt, closedDate };
}

export function reopenShiftForCorrection(draft: TaxiShiftDraft): TaxiShiftDraft {
  return { ...draft, closedAt: null, closedDate: null, correctingDate: draft.closedDate };
}

export function startNewShiftDraft(draft: TaxiShiftDraft, today: string): TaxiShiftDraft {
  if (!draft.closedAt) return draft;
  return beginEmptyShift(today);
}

export function beginEmptyShift(today: string): TaxiShiftDraft {
  return { ...emptyTaxiShiftDraft(), workDate: today };
}

export function draftHasUnsavedWork(draft: TaxiShiftDraft): boolean {
  if (draft.closedAt) return false;
  return Boolean(draft.startedAt || draft.endedAt || draft.entries.length > 0 || draft.breaks.length > 0 || draft.correctingDate);
}

export function savedDateBlock(date: string, alreadySaved: boolean, correctingDate: string | null): string | null {
  if (correctingDate && correctingDate !== date) {
    return `Korrigeringen gäller ${correctingDate} och kan inte sparas på ${date}.`;
  }
  if (!alreadySaved || correctingDate === date) return null;
  return `Datumet ${date} är redan sparat. Historiken skrivs inte över. Välj Korrigera dagen om den dagen ska ändras.`;
}

export type ShiftSaveCheck =
  | { status: 'unavailable' }
  | { status: 'locked' }
  | { status: 'ready'; date: string; alreadySaved: boolean; correctingDate: string | null };

export function decideShiftSave(check: ShiftSaveCheck): { allowSave: boolean; message: string | null } {
  if (check.status === 'unavailable') {
    return {
      allowSave: false,
      message: 'Kunde inte kontrollera om dagen redan är sparad. Ingenting sparades. Försök igen.',
    };
  }
  if (check.status === 'locked') {
    return {
      allowSave: false,
      message: 'Månaden är låst. Lås upp med en uttrycklig korrigering innan du ändrar.',
    };
  }
  const block = savedDateBlock(check.date, check.alreadySaved, check.correctingDate);
  if (block) return { allowSave: false, message: block };
  if (check.alreadySaved) {
    return { allowSave: true, message: `Datumet ${check.date} korrigeras. Sparning ersätter den sparade dagen.` };
  }
  return { allowSave: true, message: null };
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

export function stockholmCalendarDate(iso: string): string {
  return instantToStockholmInput(iso).slice(0, 10);
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

const BOOKING_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

export function parseBookingId(raw: string): string | null {
  const id = raw.trim();
  if (!BOOKING_ID.test(id)) return null;
  return id;
}

export function ownBookingLinesFromDraft(draft: TaxiShiftDraft, date: string) {
  const lines = draft.entries.flatMap((entry) => {
    if (entry.categoryId !== 'ownBookings' || !entry.bookingId) return [];
    return [{
      bookingId: entry.bookingId,
      amount: entry.amount,
      date,
      driverId: null,
      recordedAt: entry.recordedAt,
    }];
  });
  const seen = new Set<string>();
  for (const line of lines) {
    if (seen.has(line.bookingId)) return { ok: false as const, reason: `Boknings-ID ${line.bookingId} finns två gånger.` };
    seen.add(line.bookingId);
  }
  return { ok: true as const, lines };
}

export function withServerBookingLines(
  draft: TaxiShiftDraft,
  lines: Array<{ bookingId: string; amount: string; recordedAt: string }>,
): TaxiShiftDraft {
  const entries = draft.entries.filter((entry) => entry.categoryId !== 'ownBookings' || !entry.bookingId);
  for (const line of lines) {
    const amount = parseShiftAmount(line.amount) ?? line.amount;
    entries.push({
      id: `booking-${line.bookingId}`,
      categoryId: 'ownBookings',
      amount,
      recordedAt: line.recordedAt,
      bookingId: line.bookingId,
    });
  }
  return { ...draft, entries };
}

export function finishShiftClose(
  draft: TaxiShiftDraft,
  result: { ok: false } | { ok: true; savedAt: string; date: string },
): TaxiShiftDraft {
  if (!result.ok) return draft;
  return markShiftClosed(draft, result.savedAt, result.date);
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
  bookingId?: string | null,
): TaxiShiftDraft {
  return {
    ...draft,
    entries: draft.entries.map((entry) => {
      if (entry.id !== entryId) return entry;
      return entryWithBookingIds({
        ...entry,
        amount,
        bookingId: bookingId === undefined ? entry.bookingId : bookingId ?? undefined,
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
    closedAt: typeof record.closedAt === 'string' && record.closedAt ? record.closedAt : null,
    closedDate: typeof record.closedDate === 'string' && record.closedDate ? record.closedDate : null,
    correctingDate: typeof record.correctingDate === 'string' && record.correctingDate ? record.correctingDate : null,
    workDate: typeof record.workDate === 'string' && record.workDate ? record.workDate : null,
    loadedWorkedHours: typeof record.loadedWorkedHours === 'string' && record.loadedWorkedHours ? record.loadedWorkedHours : null,
    historicalEditable: record.historicalEditable === true,
    openedFingerprint: typeof record.openedFingerprint === 'string' && record.openedFingerprint ? record.openedFingerprint : null,
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
      bookingId: bookingIdFromLegacy(entry),
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
  if (entry.categoryId !== 'ownBookings' || !entry.bookingId) return next;
  const bookingId = parseBookingId(entry.bookingId);
  return bookingId ? { ...next, bookingId } : next;
}

function bookingIdFromLegacy(entry: Partial<TaxiShiftEntry> & { bookingIds?: string }): string | undefined {
  if (typeof entry.bookingId === 'string') return entry.bookingId;
  if (typeof entry.bookingIds !== 'string' || entry.bookingIds.includes(',')) return undefined;
  return entry.bookingIds;
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
