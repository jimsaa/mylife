import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTaxiLogImport } from './import/taxilogImport.ts';
import { emptyTaxiLogState, loadDailyLogFromState, saveDailyLogToState, type TaxiPayrollRecord } from './service.ts';
import {
  addBreak,
  addShiftEntry,
  applySavedDayLoad,
  beginEmptyShift,
  beginNewPass,
  commitHistoricalCorrection,
  draftFromSavedDay,
  draftHasUnsavedWork,
  historicalCorrectionPlan,
  calculateReportedWork,
  cashTotal,
  categorySharePercent,
  categorySum,
  drivingGross,
  decideShiftSave,
  emptyTaxiShiftDraft,
  endShift,
  formatWorkDuration,
  instantToStockholmInput,
  finishShiftClose,
  loadTaxiShiftDraft,
  savedDateBlock,
  startNewShiftDraft,
  markShiftClosed,
  ownBookingLinesFromDraft,
  planShiftClose,
  reopenShiftForCorrection,
  withServerBookingLines,
  reportedHoursValue,
  editShiftAmountInput,
  normalizeStockholmTime,
  parseBookingId,
  parseShiftAmount,
  stockholmFieldsToInstant,
  removeBreak,
  removeShiftEntry,
  resumeBreak,
  saveTaxiShiftDraft,
  setShiftEnd,
  setShiftStart,
  stockholmCalendarDate,
  startBreak,
  startShift,
  stockholmInputToInstant,
  updateBreak,
  updateShiftEntry,
  type TaxiShiftCategoryId,
  type TaxiShiftDraft,
} from '../../../client/src/lib/taxiShiftDraft.ts';

function memoryStorage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set('mylife.taxiShiftDraft.v1', initial);
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

describe('TaxiLog shift draft', () => {
  it('accepts positive and negative amounts and rejects text', () => {
    assert.equal(parseShiftAmount('1250'), '1250.00');
    assert.equal(parseShiftAmount('40,5'), '40.50');
    assert.equal(parseShiftAmount('-20'), '-20.00');
    assert.equal(parseShiftAmount(' -0,5 '), '-0.50');
    assert.equal(parseShiftAmount(''), null);
    assert.equal(parseShiftAmount('-'), null);
    assert.equal(parseShiftAmount('12.345'), null);
    assert.equal(parseShiftAmount('abc'), null);
  });

  it('builds a Swedish keypad amount and keeps the stored value numeric', () => {
    let value = '';
    for (const key of ['1', '5', '0', ',', '5', '0', ',', '9'] as const) {
      value = editShiftAmountInput(value, key);
    }
    assert.equal(value, '150,50');
    assert.equal(parseShiftAmount(value), '150.50');

    value = editShiftAmountInput(value, 'sign');
    assert.equal(parseShiftAmount(value), '-150.50');
    value = editShiftAmountInput(value, 'sign');
    assert.equal(value, '150,50');

    value = editShiftAmountInput('0', '5');
    assert.equal(value, '5');
    value = editShiftAmountInput('-', '2');
    assert.equal(value, '-2');
    assert.equal(parseShiftAmount(value), '-2.00');
    value = editShiftAmountInput(value, 'backspace');
    assert.equal(value, '');
    assert.equal(editShiftAmountInput('12,5', 'clear'), '');
    assert.equal(parseShiftAmount('-'), null);
    assert.equal(parseShiftAmount('12,'), null);
    assert.equal(parseShiftAmount('12,'.replace(/,$/, '')), '12.00');
  });

  it('sums repeated entries and keeps a negative correction in the category', () => {
    let draft = startShift(emptyTaxiShiftDraft(), '2026-11-05T08:00:00.000Z');
    draft = addShiftEntry(draft, {
      id: '1',
      categoryId: 'uberIncome',
      amount: '100.00',
      recordedAt: '2026-11-05T08:10:00.000Z',
    });
    draft = addShiftEntry(draft, {
      id: '2',
      categoryId: 'uberIncome',
      amount: '50.50',
      recordedAt: '2026-11-05T09:00:00.000Z',
    });
    draft = addShiftEntry(draft, {
      id: '3',
      categoryId: 'uberIncome',
      amount: '-20.00',
      recordedAt: '2026-11-05T09:05:00.000Z',
    });
    assert.equal(categorySum(draft, 'uberIncome'), '130.50');
    draft = updateShiftEntry(draft, '2', '10.00');
    assert.equal(categorySum(draft, 'uberIncome'), '90.00');
    draft = removeShiftEntry(draft, '3');
    assert.equal(categorySum(draft, 'uberIncome'), '110.00');
  });

  it('counts driving gross from the four driving categories only', () => {
    let draft = emptyTaxiShiftDraft();
    const rows: Array<[TaxiShiftDraft['entries'][number]['categoryId'], string]> = [
      ['ownBookings', '100.00'],
      ['uberIncome', '200.00'],
      ['boltIncome', '50.00'],
      ['handUp', '-10.00'],
      ['tips', '40.00'],
      ['bonus', '25.00'],
    ];
    rows.forEach(([categoryId, amount], index) => {
      draft = addShiftEntry(draft, {
        id: String(index),
        categoryId,
        amount,
        recordedAt: '2026-11-05T10:00:00.000Z',
      });
    });
    assert.equal(drivingGross(draft), '340.00');
    assert.equal(categorySum(draft, 'tips'), '40.00');
    assert.equal(categorySum(draft, 'bonus'), '25.00');
  });

  it('keeps the draft in storage across a reload and ignores a broken value', () => {
    const storage = memoryStorage();
    const started = startShift(emptyTaxiShiftDraft(), '2026-11-05T08:00:00.000Z');
    const withEntry = addShiftEntry(started, {
      id: 'entry-1',
      categoryId: 'ownBookings',
      amount: '-15.00',
      recordedAt: '2026-11-05T08:30:00.000Z',
    });
    const ended = endShift(withEntry, '2026-11-05T16:00:00.000Z');
    saveTaxiShiftDraft(storage, ended);
    const loaded = loadTaxiShiftDraft(storage);
    assert.equal(loaded.startedAt, '2026-11-05T08:00:00.000Z');
    assert.equal(loaded.endedAt, '2026-11-05T16:00:00.000Z');
    assert.equal(loaded.entries[0]?.amount, '-15.00');
    assert.equal(endShift(ended, '2026-11-05T17:00:00.000Z').endedAt, '2026-11-05T16:00:00.000Z');

    const broken = memoryStorage('{');
    assert.deepEqual(loadTaxiShiftDraft(broken), emptyTaxiShiftDraft());
  });

  it('keeps edited start and end times after the shift has ended', () => {
    let draft = endShift(startShift(emptyTaxiShiftDraft(), '2026-11-05T07:00:00.000Z'), '2026-11-05T15:00:00.000Z');
    draft = setShiftStart(draft, '2026-11-05T06:30:00.000Z');
    draft = setShiftEnd(draft, '2026-11-05T16:15:00.000Z');
    assert.equal(draft.startedAt, '2026-11-05T06:30:00.000Z');
    assert.equal(draft.endedAt, '2026-11-05T16:15:00.000Z');
    assert.equal(instantToStockholmInput('2026-11-05T07:00:00.000Z'), '2026-11-05T08:00');
    assert.equal(stockholmInputToInstant('2026-11-05T08:00'), '2026-11-05T07:00:00.000Z');
    assert.equal(stockholmInputToInstant('2026-07-15T08:00'), '2026-07-15T06:00:00.000Z');

    const storage = memoryStorage();
    saveTaxiShiftDraft(storage, draft);
    const loaded = loadTaxiShiftDraft(storage);
    assert.equal(loaded.startedAt, draft.startedAt);
    assert.equal(loaded.endedAt, draft.endedAt);
  });

  it('recalculates every category share, including negatives and a zero cash total', () => {
    const amounts: Array<[TaxiShiftCategoryId, string]> = [
      ['ownBookings', '1000.00'],
      ['uberIncome', '500.00'],
      ['boltIncome', '200.00'],
      ['handUp', '100.00'],
      ['tips', '100.00'],
      ['bonus', '100.00'],
    ];
    let draft = amounts.reduce(
      (current, [categoryId, amount], index) =>
        addShiftEntry(current, {
          id: String(index),
          categoryId,
          amount,
          recordedAt: '2026-11-05T10:00:00.000Z',
        }),
      emptyTaxiShiftDraft(),
    );
    assert.equal(cashTotal(draft), '2000.00');
    assert.equal(categorySharePercent(draft, 'ownBookings'), '50');
    assert.equal(categorySharePercent(draft, 'uberIncome'), '25');
    assert.equal(categorySharePercent(draft, 'boltIncome'), '10');
    assert.equal(categorySharePercent(draft, 'handUp'), '5');
    assert.equal(categorySharePercent(draft, 'tips'), '5');
    assert.equal(categorySharePercent(draft, 'bonus'), '5');

    draft = updateShiftEntry(draft, '1', '-100.00');
    assert.equal(cashTotal(draft), '1400.00');
    assert.equal(categorySharePercent(draft, 'uberIncome'), '-7,1');
    assert.notEqual(categorySharePercent(draft, 'uberIncome'), 'NaN');

    draft = removeShiftEntry(draft, '0');
    draft = removeShiftEntry(draft, '2');
    draft = removeShiftEntry(draft, '3');
    draft = removeShiftEntry(draft, '4');
    draft = removeShiftEntry(draft, '5');
    draft = addShiftEntry(draft, {
      id: 'offset',
      categoryId: 'ownBookings',
      amount: '100.00',
      recordedAt: '2026-11-05T11:00:00.000Z',
    });
    assert.equal(cashTotal(draft), '0.00');
    for (const category of ['ownBookings', 'uberIncome', 'boltIncome', 'handUp', 'tips', 'bonus'] as const) {
      assert.equal(categorySharePercent(draft, category), '0');
    }
  });

  it('reports the full shift when there is no break', () => {
    const draft = endShift(
      startShift(emptyTaxiShiftDraft(), '2026-11-05T03:45:00.000Z'),
      '2026-11-05T15:45:00.000Z',
    );
    const work = calculateReportedWork(draft, '2026-11-05T15:45:00.000Z');
    assert.equal(formatWorkDuration(work.shiftMs), '12 h');
    assert.equal(formatWorkDuration(work.breakMs), '0 min');
    assert.equal(formatWorkDuration(work.reportedMs), '12 h');
    assert.equal(Number.isNaN(work.reportedMs), false);
  });

  it('subtracts one break and sums several breaks', () => {
    let draft = endShift(
      startShift(emptyTaxiShiftDraft(), '2026-11-05T03:45:00.000Z'),
      '2026-11-05T15:45:00.000Z',
    );
    draft = addBreak(draft, {
      id: 'lunch',
      startedAt: '2026-11-05T09:00:00.000Z',
      endedAt: '2026-11-05T09:45:00.000Z',
    });
    const one = calculateReportedWork(draft, '2026-11-05T15:45:00.000Z');
    assert.equal(formatWorkDuration(one.breakMs), '45 min');
    assert.equal(formatWorkDuration(one.reportedMs), '11 h 15 min');

    draft = addBreak(draft, {
      id: 'short',
      startedAt: '2026-11-05T12:00:00.000Z',
      endedAt: '2026-11-05T12:15:00.000Z',
    });
    const several = calculateReportedWork(draft, '2026-11-05T15:45:00.000Z');
    assert.equal(formatWorkDuration(several.breakMs), '1 h');
    assert.equal(formatWorkDuration(several.reportedMs), '11 h');
  });

  it('counts an open break until now and does not double-count overlaps', () => {
    const running = startBreak(
      startShift(emptyTaxiShiftDraft(), '2026-11-05T07:00:00.000Z'),
      { id: 'open', startedAt: '2026-11-05T08:30:00.000Z', endedAt: null },
    );
    const open = calculateReportedWork(running, '2026-11-05T09:00:00.000Z');
    assert.equal(formatWorkDuration(open.shiftMs), '2 h');
    assert.equal(formatWorkDuration(open.breakMs), '30 min');
    assert.equal(formatWorkDuration(open.reportedMs), '1 h 30 min');

    const ended = endShift(running, '2026-11-05T09:00:00.000Z');
    assert.equal(ended.breaks[0]?.endedAt, '2026-11-05T09:00:00.000Z');
    assert.equal(startBreak(ended, { id: 'later', startedAt: '2026-11-05T09:10:00.000Z', endedAt: null }), ended);

    let overlap = endShift(
      startShift(emptyTaxiShiftDraft(), '2026-11-05T07:00:00.000Z'),
      '2026-11-05T15:00:00.000Z',
    );
    overlap = addBreak(overlap, {
      id: 'a',
      startedAt: '2026-11-05T09:00:00.000Z',
      endedAt: '2026-11-05T10:00:00.000Z',
    });
    overlap = addBreak(overlap, {
      id: 'b',
      startedAt: '2026-11-05T09:30:00.000Z',
      endedAt: '2026-11-05T10:30:00.000Z',
    });
    const merged = calculateReportedWork(overlap, '2026-11-05T15:00:00.000Z');
    assert.equal(formatWorkDuration(merged.breakMs), '1 h 30 min');
    assert.equal(formatWorkDuration(merged.reportedMs), '6 h 30 min');
  });

  it('keeps edited breaks and shift times after the shift has ended', () => {
    let draft = endShift(
      startShift(emptyTaxiShiftDraft(), '2026-11-05T03:45:00.000Z'),
      '2026-11-05T15:45:00.000Z',
    );
    draft = addBreak(draft, {
      id: 'lunch',
      startedAt: '2026-11-05T09:00:00.000Z',
      endedAt: '2026-11-05T09:30:00.000Z',
    });
    draft = setShiftStart(draft, '2026-11-05T03:30:00.000Z');
    draft = setShiftEnd(draft, '2026-11-05T15:30:00.000Z');
    draft = updateBreak(draft, 'lunch', {
      startedAt: '2026-11-05T08:00:00.000Z',
      endedAt: '2026-11-05T08:45:00.000Z',
    });
    const resumed = resumeBreak(draft, '2026-11-05T16:00:00.000Z');
    assert.equal(resumed, draft);
    const removed = removeBreak(draft, 'missing');
    assert.equal(removed.breaks.length, 1);
    const work = calculateReportedWork(draft, '2026-11-05T16:00:00.000Z');
    assert.equal(formatWorkDuration(work.breakMs), '45 min');
    assert.equal(Number.isNaN(work.reportedMs), false);
    assert.ok(work.reportedMs >= 0);

    const storage = memoryStorage();
    saveTaxiShiftDraft(storage, draft);
    const loaded = loadTaxiShiftDraft(storage);
    assert.equal(loaded.startedAt, '2026-11-05T03:30:00.000Z');
    assert.equal(loaded.endedAt, '2026-11-05T15:30:00.000Z');
    assert.equal(loaded.breaks[0]?.endedAt, '2026-11-05T08:45:00.000Z');

    const legacy = memoryStorage(
      JSON.stringify({
        version: 1,
        startedAt: '2026-11-05T07:00:00.000Z',
        endedAt: null,
        entries: [],
      }),
    );
    const compatible = loadTaxiShiftDraft(legacy);
    assert.deepEqual(compatible.breaks, []);
    assert.equal(compatible.startedAt, '2026-11-05T07:00:00.000Z');

    const legacyEntry = memoryStorage(
      JSON.stringify({
        version: 1,
        startedAt: '2026-11-05T03:45:00.000Z',
        endedAt: '2026-11-05T15:45:00.000Z',
        entries: [
          {
            id: 'old-own',
            categoryId: 'ownBookings',
            amount: '1800.00',
            recordedAt: '2026-11-05T08:00:00.000Z',
          },
          {
            id: 'uber',
            categoryId: 'uberIncome',
            amount: '100.00',
            recordedAt: '2026-11-05T09:00:00.000Z',
            bookingIds: 'JS999',
          },
        ],
      }),
    );
    const oldDraft = loadTaxiShiftDraft(legacyEntry);
    assert.equal(oldDraft.entries[0]?.bookingId, undefined);
    assert.equal(oldDraft.entries[1]?.bookingId, undefined);
    assert.equal(categorySum(oldDraft, 'ownBookings'), '1800.00');
    assert.equal(drivingGross(oldDraft), '1900.00');
    const invalid = calculateReportedWork(
      { ...compatible, endedAt: '2026-11-05T06:00:00.000Z' },
      '2026-11-05T08:00:00.000Z',
    );
    assert.deepEqual(invalid, { shiftMs: 0, breakMs: 0, reportedMs: 0 });
  });

  it('stores one booking id on an own booking and ignores it in the totals', () => {
    assert.equal(parseBookingId(' JS001 '), 'JS001');
    assert.equal(parseBookingId('JS001, JS002'), null);
    assert.equal(parseBookingId(''), null);
    assert.equal(parseBookingId('JS 001'), null);

    let draft = startShift(emptyTaxiShiftDraft(), '2026-11-05T03:45:00.000Z');
    draft = addShiftEntry(draft, {
      id: 'own-1',
      categoryId: 'ownBookings',
      amount: '1800.00',
      recordedAt: '2026-11-05T08:00:00.000Z',
      bookingId: 'JS001',
    });
    draft = addShiftEntry(draft, {
      id: 'uber-1',
      categoryId: 'uberIncome',
      amount: '200.00',
      recordedAt: '2026-11-05T09:00:00.000Z',
      bookingId: 'NOPE',
    });
    assert.equal(draft.entries[0]?.bookingId, 'JS001');
    assert.equal(draft.entries[1]?.bookingId, undefined);
    assert.equal(categorySum(draft, 'ownBookings'), '1800.00');
    assert.equal(categorySharePercent(draft, 'ownBookings'), '90');
    const before = calculateReportedWork(draft, '2026-11-05T15:45:00.000Z');

    draft = updateShiftEntry(draft, 'own-1', '1800.00', 'JS003');
    assert.equal(draft.entries[0]?.bookingId, 'JS003');
    assert.deepEqual(calculateReportedWork(draft, '2026-11-05T15:45:00.000Z'), before);

    const storage = memoryStorage();
    saveTaxiShiftDraft(storage, draft);
    const loaded = loadTaxiShiftDraft(storage);
    assert.equal(loaded.entries[0]?.bookingId, 'JS003');
    assert.equal(loaded.entries[0]?.amount, '1800.00');

    draft = updateShiftEntry(draft, 'own-1', '1800.00', null);
    assert.equal(draft.entries[0]?.bookingId, undefined);
    draft = removeShiftEntry(draft, 'own-1');
    assert.equal(draft.entries.some((entry) => entry.id === 'own-1'), false);
    saveTaxiShiftDraft(storage, draft);
    assert.equal(loadTaxiShiftDraft(storage).entries.some((entry) => entry.bookingId), false);
  });

  it('keeps the same draft when start and end are set, corrected, and cross midnight', () => {
    assert.equal(normalizeStockholmTime('22:15:00'), '22:15');
    assert.equal(
      stockholmFieldsToInstant('2026-11-05', '22:00:00'),
      stockholmInputToInstant('2026-11-05T22:00'),
    );

    let draft = addShiftEntry(emptyTaxiShiftDraft(), {
      id: 'own-1',
      categoryId: 'ownBookings',
      amount: '1800.00',
      recordedAt: '2026-11-05T21:00:00.000Z',
      bookingId: 'JS001',
    });
    draft = addBreak(draft, {
      id: 'night',
      startedAt: '2026-11-05T22:00:00.000Z',
      endedAt: '2026-11-05T22:30:00.000Z',
    });
    draft = setShiftEnd(draft, '2026-11-06T05:00:00.000Z');
    draft = startShift(draft, '2026-11-05T20:00:00.000Z');
    assert.equal(draft.startedAt, '2026-11-05T20:00:00.000Z');
    assert.equal(draft.endedAt, '2026-11-06T05:00:00.000Z');

    let work = calculateReportedWork(draft, '2026-11-06T12:00:00.000Z');
    assert.equal(formatWorkDuration(work.shiftMs), '9 h');
    assert.equal(formatWorkDuration(work.breakMs), '30 min');
    assert.equal(formatWorkDuration(work.reportedMs), '8 h 30 min');

    draft = setShiftStart(draft, '2026-11-05T21:00:00.000Z');
    draft = setShiftEnd(draft, '2026-11-06T04:00:00.000Z');
    work = calculateReportedWork(draft, '2026-11-06T12:00:00.000Z');
    assert.equal(formatWorkDuration(work.shiftMs), '7 h');
    assert.equal(formatWorkDuration(work.reportedMs), '6 h 30 min');
    assert.equal(draft.entries[0]?.amount, '1800.00');
    assert.equal(draft.entries[0]?.bookingId, 'JS001');
    assert.equal(draft.breaks[0]?.startedAt, '2026-11-05T22:00:00.000Z');
    assert.equal(draft.breaks[0]?.endedAt, '2026-11-05T22:30:00.000Z');

    const invalid = calculateReportedWork(
      setShiftEnd(draft, '2026-11-05T18:00:00.000Z'),
      '2026-11-06T12:00:00.000Z',
    );
    assert.equal(invalid.shiftMs, 0);
    assert.equal(invalid.reportedMs, 0);

    const storage = memoryStorage();
    saveTaxiShiftDraft(storage, draft);
    const loaded = loadTaxiShiftDraft(storage);
    assert.equal(loaded.startedAt, draft.startedAt);
    assert.equal(loaded.endedAt, draft.endedAt);
    assert.equal(loaded.entries[0]?.bookingId, 'JS001');
    assert.equal(loaded.breaks.length, 1);
  });

  it('plans a close only after a valid end and keeps booking ids in the draft', () => {
    const now = '2026-11-05T16:00:00.000Z';
    let draft = emptyTaxiShiftDraft();
    draft = setShiftStart(draft, '2026-11-05T03:45:00.000Z');
    assert.equal(planShiftClose(draft, now).ok, false);

    draft = setShiftEnd(draft, '2026-11-05T03:00:00.000Z');
    assert.equal(planShiftClose(draft, now).ok, false);

    draft = setShiftEnd(draft, '2026-11-05T15:45:00.000Z');
    draft = addBreak(draft, {
      id: 'break-1',
      startedAt: '2026-11-05T08:00:00.000Z',
      endedAt: '2026-11-05T08:45:00.000Z',
    });
    draft = addShiftEntry(draft, {
      id: 'own-1',
      categoryId: 'ownBookings',
      amount: '1800.00',
      recordedAt: '2026-11-05T04:00:00.000Z',
      bookingId: 'JS001',
    });
    draft = addShiftEntry(draft, {
      id: 'uber-1',
      categoryId: 'uberIncome',
      amount: '200.00',
      recordedAt: '2026-11-05T05:00:00.000Z',
    });
    draft = addShiftEntry(draft, {
      id: 'bolt-1',
      categoryId: 'boltIncome',
      amount: '100.00',
      recordedAt: '2026-11-05T06:00:00.000Z',
    });
    draft = addShiftEntry(draft, {
      id: 'hand-1',
      categoryId: 'handUp',
      amount: '50.00',
      recordedAt: '2026-11-05T07:00:00.000Z',
    });
    draft = addShiftEntry(draft, {
      id: 'tips-1',
      categoryId: 'tips',
      amount: '40.00',
      recordedAt: '2026-11-05T08:00:00.000Z',
    });
    draft = addShiftEntry(draft, {
      id: 'bonus-1',
      categoryId: 'bonus',
      amount: '10.00',
      recordedAt: '2026-11-05T09:00:00.000Z',
    });

    const work = calculateReportedWork(draft, now);
    assert.equal(formatWorkDuration(work.reportedMs), '11 h 15 min');
    assert.equal(reportedHoursValue(work.reportedMs), '11.25');

    const planned = planShiftClose(draft, now);
    assert.equal(planned.ok, true);
    if (!planned.ok) return;
    assert.equal(planned.plan.date, '2026-11-05');
    assert.equal(planned.plan.workedHours, '11.25');
    assert.match(planned.plan.text, /OWN_BOOKINGS=1800\.00/);
    assert.match(planned.plan.text, /UBER_INCOME=200\.00/);
    assert.match(planned.plan.text, /BOLT_INCOME=100\.00/);
    assert.match(planned.plan.text, /HAND_UP=50\.00/);
    assert.match(planned.plan.text, /TIPS=40\.00/);
    assert.match(planned.plan.text, /BONUS=10\.00/);
    assert.match(planned.plan.text, /WORKED_HOURS=11\.25/);
    assert.equal(planned.plan.text.includes('JS001'), false);
    assert.equal(draft.closedAt, null);
    assert.equal(draft.entries.find((entry) => entry.id === 'own-1')?.bookingId, 'JS001');

    const parsed = parseTaxiLogImport(planned.plan.text);
    assert.equal(parsed.version, '3');
    assert.equal(parsed.date, '2026-11-05');
    assert.equal(parsed.ownBookings, '1800');
    assert.equal(parsed.uberIncome, '200');
    assert.equal(parsed.boltIncome, '100');
    assert.equal(parsed.handUp, '50');
    assert.equal(parsed.tips, '40');
    assert.equal(parsed.bonus, '10');
    assert.equal(parsed.workedHours, '11.25');
    assert.equal(parsed.grossIncome, '2150');

    const saved = saveDailyLogToState(emptyTaxiLogState(), {
      date: parsed.date,
      grossIncome: parsed.grossIncome,
      tips: parsed.tips,
      workedHours: parsed.workedHours,
      ownBookings: parsed.ownBookings,
      otherIncome: parsed.otherIncome,
      handUp: parsed.handUp,
      uberIncome: parsed.uberIncome,
      boltIncome: parsed.boltIncome,
      bonus: parsed.bonus,
    });
    assert.equal(saved.workDays.length, 1);
    assert.equal(saved.workDays[0]?.workHours, '11.25');
    assert.equal(saved.workDays[0]?.ownBookings, '1800');

    const replaced = saveDailyLogToState(saved, {
      correctingDate: parsed.date,
      date: parsed.date,
      grossIncome: parsed.grossIncome,
      tips: '5',
      workedHours: parsed.workedHours,
      ownBookings: parsed.ownBookings,
      handUp: parsed.handUp,
      uberIncome: parsed.uberIncome,
      boltIncome: parsed.boltIncome,
      bonus: parsed.bonus,
    });
    assert.equal(replaced.workDays.length, 1);
    assert.equal(replaced.workDays[0]?.tips, '5.00');

    const locked = emptyTaxiLogState();
    locked.payrolls = [lockedPayroll()];
    assert.throws(
      () =>
        saveDailyLogToState(locked, {
          date: parsed.date,
          grossIncome: parsed.grossIncome,
          tips: parsed.tips,
          workedHours: parsed.workedHours,
          ownBookings: parsed.ownBookings,
          handUp: parsed.handUp,
          uberIncome: parsed.uberIncome,
          boltIncome: parsed.boltIncome,
          bonus: parsed.bonus,
        }),
      /Månaden är låst/,
    );
    assert.equal(locked.workDays.length, 0);

    const negative = addShiftEntry(draft, {
      id: 'uber-neg',
      categoryId: 'uberIncome',
      amount: '-300.00',
      recordedAt: '2026-11-05T10:00:00.000Z',
    });
    const blocked = planShiftClose(negative, now);
    assert.equal(blocked.ok, false);
    assert.equal(negative.entries.length, draft.entries.length + 1);

    const cleared = setShiftEnd(draft, null);
    assert.equal(planShiftClose(cleared, now).ok, false);
    assert.equal(cleared.entries.find((entry) => entry.id === 'own-1')?.bookingId, 'JS001');

    const closed = markShiftClosed(draft, '2026-11-05T16:05:00.000Z', planned.plan.date);
    assert.equal(closed.closedDate, '2026-11-05');
    assert.equal(closed.entries.find((entry) => entry.id === 'own-1')?.bookingId, 'JS001');
    const reopened = reopenShiftForCorrection(closed);
    assert.equal(reopened.closedAt, null);
    assert.equal(reopened.entries.length, closed.entries.length);

    const legacy = loadTaxiShiftDraft(
      memoryStorage(JSON.stringify({ version: 1, startedAt: draft.startedAt, endedAt: draft.endedAt, entries: [], breaks: [] })),
    );
    assert.equal(legacy.closedAt, null);
    const stored = memoryStorage();
    saveTaxiShiftDraft(stored, closed);
    assert.equal(loadTaxiShiftDraft(stored).closedAt, closed.closedAt);
    assert.equal(loadTaxiShiftDraft(stored).entries[0]?.bookingId, 'JS001');

    const versionOne = parseTaxiLogImport(`TAXILOG_IMPORT
VERSION=1
DATE=2026-11-01
GROSS_INCOME=100
TIPS=0
WORKED_HOURS=1
END_TAXILOG_IMPORT`);
    assert.equal(versionOne.version, '1');
    assert.equal(versionOne.grossIncome, '100');
  });

  it('stores individual bookings permanently without changing the salary day', () => {
    const recordedAt = '2026-11-05T08:00:00.000Z';
    const day = {
      date: '2026-11-05',
      grossIncome: '1800',
      tips: '0',
      workedHours: '8',
      ownBookings: '1800',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
    };
    const plain = saveDailyLogToState(emptyTaxiLogState(), day);
    const saved = saveDailyLogToState(emptyTaxiLogState(), {
      ...day,
      ownBookingLines: [
        { bookingId: 'JS001', amount: '800', recordedAt },
        { bookingId: 'JS002', amount: '1000', recordedAt },
      ],
    });
    assert.equal(saved.ownBookingLines.length, 2);
    assert.equal(saved.ownBookingLines[0]?.bookingId, 'JS001');
    assert.equal(saved.ownBookingLines[1]?.amount, '1000.00');
    assert.equal(saved.workDays[0]?.ownBookings, '1800');
    assert.equal(saved.workDays[0]?.totalIncome, plain.workDays[0]?.totalIncome);
    assert.equal(saved.workDays[0]?.vatAmount, plain.workDays[0]?.vatAmount);
    assert.equal(saved.workDays[0]?.incomeExVat, plain.workDays[0]?.incomeExVat);
    assert.equal(saved.payrolls[0]?.accruedSalary, plain.payrolls[0]?.accruedSalary);

    const opened = loadDailyLogFromState(saved, '2026-11-05');
    assert.equal(opened?.ownBookingLines.length, 2);
    assert.equal(opened?.ownBookingLines[0]?.bookingId, 'JS001');
    assert.equal(opened?.ownBookings, '1800');

    const renamed = saveDailyLogToState(saved, {
      ...day,
      correctingDate: day.date,
      ownBookingLines: [
        { bookingId: 'JS009', amount: '800', recordedAt },
        { bookingId: 'JS002', amount: '1000', recordedAt },
      ],
    });
    assert.equal(renamed.workDays[0]?.ownBookings, saved.workDays[0]?.ownBookings);
    assert.equal(renamed.workDays[0]?.totalIncome, saved.workDays[0]?.totalIncome);
    assert.equal(renamed.workDays[0]?.vatAmount, saved.workDays[0]?.vatAmount);
    assert.equal(renamed.ownBookingLines.find((line) => line.bookingId === 'JS009')?.amount, '800.00');

    assert.throws(
      () => saveDailyLogToState(renamed, {
        ...day,
        date: '2026-11-06',
        ownBookingLines: [{ bookingId: 'JS009', amount: '100', recordedAt }],
      }),
      /finns redan/,
    );
    assert.equal(loadDailyLogFromState(renamed, '2026-11-05')?.ownBookingLines.length, 2);

    const historical = saveDailyLogToState(emptyTaxiLogState(), day);
    assert.deepEqual(historical.ownBookingLines, []);
    assert.deepEqual(loadDailyLogFromState(historical, '2026-11-05')?.ownBookingLines, []);
    assert.equal(loadDailyLogFromState(historical, '2026-11-05')?.ownBookings, '1800');

    const otherDriver = saveDailyLogToState(saved, {
      ...day,
      correctingDate: day.date,
      driverId: 'driver-b',
      grossIncome: '500',
      ownBookings: '500',
      ownBookingLines: [{ bookingId: 'JS100', amount: '500', recordedAt }],
    });
    assert.equal(otherDriver.workDays.length, 1);
    assert.equal(otherDriver.workDays[0]?.ownBookings, '1800');
    assert.equal(otherDriver.workDays[0]?.totalIncome, saved.workDays[0]?.totalIncome);
    assert.equal(otherDriver.ownBookingLines.filter((line) => line.date === '2026-11-05').length, 3);
    assert.equal(otherDriver.ownBookingLines.find((line) => line.bookingId === 'JS100')?.driverId, 'driver-b');

    const legacy = loadTaxiShiftDraft(memoryStorage(JSON.stringify({
      version: 1,
      startedAt: '2026-11-05T03:45:00.000Z',
      endedAt: null,
      entries: [{
        id: 'old',
        categoryId: 'ownBookings',
        amount: '50.00',
        recordedAt,
        bookingIds: 'JS001',
      }],
      breaks: [],
    })));
    assert.equal(legacy.entries[0]?.bookingId, 'JS001');

    let draft = emptyTaxiShiftDraft();
    draft = setShiftStart(draft, '2026-11-05T03:45:00.000Z');
    draft = setShiftEnd(draft, '2026-11-05T15:45:00.000Z');
    draft = addShiftEntry(draft, {
      id: 'a',
      categoryId: 'ownBookings',
      amount: '800.00',
      recordedAt,
      bookingId: 'JS001',
    });
    draft = addShiftEntry(draft, {
      id: 'b',
      categoryId: 'ownBookings',
      amount: '1000.00',
      recordedAt,
      bookingId: 'JS002',
    });
    const collected = ownBookingLinesFromDraft(draft, '2026-11-05');
    assert.equal(collected.ok, true);
    if (collected.ok) assert.equal(collected.lines.length, 2);
    const restored = withServerBookingLines(emptyTaxiShiftDraft(), [
      { bookingId: 'JS001', amount: '800.00', recordedAt },
      { bookingId: 'JS002', amount: '1000.00', recordedAt },
    ]);
    assert.equal(restored.entries.length, 2);
    assert.equal(restored.entries[1]?.bookingId, 'JS002');
    assert.equal(finishShiftClose(draft, { ok: false }).closedAt, null);
    const closedDay = finishShiftClose(draft, { ok: true, savedAt: recordedAt, date: '2026-11-05' });
    assert.equal(closedDay.closedAt, recordedAt);
    const unsaved = startNewShiftDraft(draft, '2026-11-06');
    assert.equal(unsaved, draft);
    assert.equal(unsaved.entries[0]?.bookingId, 'JS001');
    const nextDay = startNewShiftDraft(closedDay, '2026-11-06');
    assert.equal(nextDay.workDate, '2026-11-06');
    assert.equal(nextDay.startedAt, null);
    assert.equal(nextDay.endedAt, null);
    assert.equal(nextDay.entries.length, 0);
    assert.equal(nextDay.breaks.length, 0);
    assert.equal(nextDay.closedAt, null);
    assert.equal(savedDateBlock('2026-11-05', true, null)?.includes('redan sparat'), true);
    assert.equal(savedDateBlock('2026-11-06', false, null), null);
    assert.equal(savedDateBlock('2026-11-05', true, '2026-11-05'), null);
    const reopened = reopenShiftForCorrection(closedDay);
    assert.equal(reopened.correctingDate, '2026-11-05');
    assert.equal(reopened.entries[0]?.bookingId, 'JS001');
  });

  it('A–C saves two dates separately and corrects only the chosen date', () => {
    const recordedAt = '2026-11-05T18:00:00.000Z';
    const firstDay = {
      date: '2026-11-05',
      grossIncome: '1800',
      tips: '0',
      workedHours: '8',
      ownBookings: '1800',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
      ownBookingLines: [
        { bookingId: 'JS001', amount: '800', recordedAt },
        { bookingId: 'JS002', amount: '1000', recordedAt },
      ],
    };
    const first = saveDailyLogToState(emptyTaxiLogState(), firstDay);
    let closed = emptyTaxiShiftDraft();
    closed = setShiftStart(closed, '2026-11-05T07:00:00.000Z');
    closed = addShiftEntry(closed, {
      id: 'a',
      categoryId: 'ownBookings',
      amount: '800.00',
      recordedAt,
      bookingId: 'JS001',
    });
    closed = finishShiftClose(closed, { ok: true, savedAt: recordedAt, date: '2026-11-05' });
    const nextDraft = startNewShiftDraft(closed, '2026-11-06');
    assert.equal(nextDraft.workDate, '2026-11-06');
    assert.equal(nextDraft.correctingDate, null);
    assert.equal(nextDraft.entries.length, 0);
    assert.equal(nextDraft.startedAt, null);

    const second = saveDailyLogToState(first, {
      date: '2026-11-06',
      grossIncome: '500',
      tips: '20',
      workedHours: '4',
      ownBookings: '500',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
      ownBookingLines: [{ bookingId: 'JS010', amount: '500', recordedAt: '2026-11-06T08:00:00.000Z' }],
    });
    const dayFive = loadDailyLogFromState(second, '2026-11-05');
    const daySix = loadDailyLogFromState(second, '2026-11-06');
    assert.equal(dayFive?.ownBookings, '1800');
    assert.equal(dayFive?.grossIncome, '1800.00');
    assert.deepEqual(dayFive?.ownBookingLines.map((line) => [line.bookingId, line.amount]), [
      ['JS001', '800.00'],
      ['JS002', '1000.00'],
    ]);
    assert.equal(daySix?.ownBookings, '500');
    assert.equal(daySix?.tips, '20.00');
    assert.deepEqual(daySix?.ownBookingLines.map((line) => [line.bookingId, line.amount]), [['JS010', '500.00']]);

    assert.throws(() => saveDailyLogToState(second, firstDay), /redan sparat/);
    assert.equal(loadDailyLogFromState(second, '2026-11-05')?.ownBookings, '1800');
    assert.equal(loadDailyLogFromState(second, '2026-11-05')?.ownBookingLines[0]?.bookingId, 'JS001');
    assert.throws(
      () => saveDailyLogToState(second, { ...firstDay, date: '2026-11-06', correctingDate: '2026-11-05' }),
      /Korrigeringen gäller 2026-11-05/,
    );
    assert.equal(loadDailyLogFromState(second, '2026-11-06')?.ownBookings, '500');

    const corrected = saveDailyLogToState(second, {
      ...firstDay,
      grossIncome: '1900',
      ownBookings: '1900',
      correctingDate: '2026-11-05',
      ownBookingLines: [
        { bookingId: 'JS001', amount: '900', recordedAt },
        { bookingId: 'JS002', amount: '1000', recordedAt },
      ],
    });
    assert.equal(loadDailyLogFromState(corrected, '2026-11-05')?.ownBookings, '1900');
    assert.equal(loadDailyLogFromState(corrected, '2026-11-05')?.ownBookingLines[0]?.amount, '900.00');
    assert.equal(loadDailyLogFromState(corrected, '2026-11-06')?.ownBookings, '500');
    assert.equal(loadDailyLogFromState(corrected, '2026-11-06')?.ownBookingLines[0]?.bookingId, 'JS010');
    assert.equal(loadDailyLogFromState(corrected, '2026-11-06')?.grossIncome, daySix?.grossIncome);
  });

  it('D keeps the draft when the TaxiLog check fails', () => {
    const draft = addShiftEntry(setShiftStart(emptyTaxiShiftDraft(), '2026-11-05T07:00:00.000Z'), {
      id: 'a',
      categoryId: 'ownBookings',
      amount: '800.00',
      recordedAt: '2026-11-05T08:00:00.000Z',
      bookingId: 'JS001',
    });
    const decision = decideShiftSave({ status: 'unavailable' });
    assert.equal(decision.allowSave, false);
    assert.match(decision.message ?? '', /Ingenting sparades/);
    const kept = decision.allowSave
      ? finishShiftClose(draft, { ok: true, savedAt: '2026-11-05T16:00:00.000Z', date: '2026-11-05' })
      : draft;
    assert.equal(kept, draft);
    assert.equal(kept.closedAt, null);
    assert.equal(kept.entries[0]?.bookingId, 'JS001');
    assert.equal(kept.entries[0]?.amount, '800.00');
    const blocked = decideShiftSave({
      status: 'ready',
      date: '2026-11-05',
      alreadySaved: true,
      correctingDate: null,
    });
    assert.equal(blocked.allowSave, false);
    assert.match(blocked.message ?? '', /redan sparat/);
  });

  it('E keeps an overnight shift on the Swedish start date', () => {
    const startedAt = stockholmInputToInstant('2026-11-06T19:00');
    const endedAt = stockholmInputToInstant('2026-11-07T04:00');
    assert.ok(startedAt);
    assert.ok(endedAt);
    const draft = setShiftEnd(setShiftStart(emptyTaxiShiftDraft(), startedAt), endedAt);
    const planned = planShiftClose(draft, endedAt);
    assert.equal(planned.ok, true);
    if (!planned.ok) return;
    assert.equal(planned.plan.date, '2026-11-06');
    assert.equal(planned.plan.workedHours, '9.00');
    assert.equal(formatWorkDuration(calculateReportedWork(draft, endedAt).shiftMs), '9 h');
    const saved = saveDailyLogToState(emptyTaxiLogState(), {
      date: planned.plan.date,
      grossIncome: '400',
      tips: '0',
      workedHours: planned.plan.workedHours,
      ownBookings: '400',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
      ownBookingLines: [{ bookingId: 'JS020', amount: '400', recordedAt: startedAt }],
    });
    const loaded = loadDailyLogFromState(saved, '2026-11-06');
    assert.equal(loaded?.date, '2026-11-06');
    assert.equal(Number(loaded?.workedHours), 9);
    assert.equal(loaded?.ownBookings, '400');
    assert.equal(loaded?.ownBookingLines[0]?.bookingId, 'JS020');
    assert.equal(loadDailyLogFromState(saved, '2026-11-07'), null);
  });

  it('F uses Europe/Stockholm around midnight in winter and summer', () => {
    assert.equal(stockholmCalendarDate('2026-11-05T22:30:00.000Z'), '2026-11-05');
    assert.equal(stockholmCalendarDate('2026-11-05T23:30:00.000Z'), '2026-11-06');
    assert.equal(stockholmCalendarDate('2026-07-14T21:30:00.000Z'), '2026-07-14');
    assert.equal(stockholmCalendarDate('2026-07-14T22:30:00.000Z'), '2026-07-15');

    const startedAt = stockholmInputToInstant('2026-11-05T23:30');
    const endedAt = stockholmInputToInstant('2026-11-06T01:00');
    assert.ok(startedAt);
    assert.ok(endedAt);
    const started = setShiftStart(emptyTaxiShiftDraft(), startedAt);
    assert.equal(startNewShiftDraft(started, '2026-11-06'), started);
    const planned = planShiftClose(setShiftEnd(started, endedAt), endedAt);
    assert.equal(planned.ok, true);
    if (!planned.ok) return;
    assert.equal(planned.plan.date, '2026-11-05');
  });

  it('G clears correction mode when a new day starts', () => {
    const recordedAt = '2026-11-05T16:00:00.000Z';
    const closed = finishShiftClose(
      addShiftEntry(setShiftStart(emptyTaxiShiftDraft(), '2026-11-05T07:00:00.000Z'), {
        id: 'a',
        categoryId: 'ownBookings',
        amount: '800.00',
        recordedAt,
        bookingId: 'JS001',
      }),
      { ok: true, savedAt: recordedAt, date: '2026-11-05' },
    );
    const reopened = reopenShiftForCorrection(closed);
    assert.equal(reopened.correctingDate, '2026-11-05');
    assert.equal(startNewShiftDraft(reopened, '2026-11-06'), reopened);
    assert.equal(reopened.entries[0]?.bookingId, 'JS001');
    const sealed = markShiftClosed(reopened, recordedAt, '2026-11-05');
    const fresh = startNewShiftDraft(sealed, '2026-11-06');
    assert.equal(fresh.correctingDate, null);
    assert.equal(fresh.workDate, '2026-11-06');
    assert.equal(fresh.entries.length, 0);
    assert.equal(fresh.startedAt, null);
    assert.equal(fresh.breaks.length, 0);
    assert.equal(sealed.correctingDate, '2026-11-05');
    assert.equal(sealed.entries[0]?.bookingId, 'JS001');
  });

  it('starts a new pass from a closed day and leaves an active pass unchanged', () => {
    const nowIso = '2026-11-06T08:00:00.000Z';
    const closed = finishShiftClose(
      addShiftEntry(setShiftStart(emptyTaxiShiftDraft(), '2026-11-05T07:00:00.000Z'), {
        id: 'a',
        categoryId: 'ownBookings',
        amount: '800.00',
        recordedAt: '2026-11-05T08:00:00.000Z',
        bookingId: 'JS001',
      }),
      { ok: true, savedAt: '2026-11-05T16:00:00.000Z', date: '2026-11-05' },
    );
    const next = beginNewPass(closed, nowIso);
    assert.equal(next.startedAt, nowIso);
    assert.equal(next.closedAt, null);
    assert.equal(next.correctingDate, null);
    assert.equal(next.entries.length, 0);
    assert.equal(next.workDate, '2026-11-06');
    assert.equal(closed.entries[0]?.bookingId, 'JS001');
    const idle = addShiftEntry(emptyTaxiShiftDraft(), {
      id: 'b',
      categoryId: 'uberIncome',
      amount: '100.00',
      recordedAt: nowIso,
    });
    const started = beginNewPass(idle, nowIso);
    assert.equal(started.startedAt, nowIso);
    assert.equal(started.entries.length, 1);
    const active = beginNewPass(started, '2026-11-06T09:00:00.000Z');
    assert.equal(active, started);
    const ended = endShift(started, '2026-11-06T18:00:00.000Z');
    const fresh = beginNewPass(ended, '2026-11-07T07:00:00.000Z');
    assert.equal(fresh.startedAt, '2026-11-07T07:00:00.000Z');
    assert.equal(fresh.endedAt, null);
    assert.equal(fresh.closedAt, null);
    assert.equal(fresh.entries.length, 0);
    assert.equal(fresh.workDate, '2026-11-07');
    assert.equal(ended.entries.length, 1);
    const correcting = { ...started, startedAt: null, correctingDate: '2026-11-05', closedAt: null };
    assert.equal(beginNewPass(correcting, nowIso), correcting);
  });

  it('A–H opens a saved day, adds and edits bookings, and leaves the other day unchanged', () => {
    const recordedAt = '2026-11-05T18:00:00.000Z';
    const now = '2026-11-06T10:00:00.000Z';
    const first = saveDailyLogToState(emptyTaxiLogState(), {
      date: '2026-11-05',
      grossIncome: '2150',
      tips: '40',
      workedHours: '9',
      ownBookings: '1800',
      handUp: '50',
      uberIncome: '200',
      boltIncome: '100',
      bonus: '10',
      ownBookingLines: [
        { bookingId: 'JS001', amount: '800', recordedAt },
        { bookingId: 'JS002', amount: '1000', recordedAt },
      ],
    });
    const both = saveDailyLogToState(first, {
      date: '2026-11-06',
      grossIncome: '500',
      tips: '20',
      workedHours: '4',
      ownBookings: '500',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
      ownBookingLines: [{ bookingId: 'JS010', amount: '500', recordedAt: '2026-11-06T08:00:00.000Z' }],
    });
    const loaded = loadDailyLogFromState(both, '2026-11-05');
    assert.ok(loaded);
    const opened = draftFromSavedDay(loaded, now);
    assert.equal(opened.correctingDate, '2026-11-05');
    assert.equal(opened.startedAt, null);
    assert.equal(opened.endedAt, null);
    assert.equal(opened.breaks.length, 0);
    assert.equal(opened.loadedWorkedHours, loaded.workedHours);
    assert.equal(categorySum(opened, 'ownBookings'), '1800.00');
    assert.equal(categorySum(opened, 'uberIncome'), '200.00');
    assert.equal(categorySum(opened, 'boltIncome'), '100.00');
    assert.equal(categorySum(opened, 'handUp'), '50.00');
    assert.equal(categorySum(opened, 'tips'), '40.00');
    assert.equal(categorySum(opened, 'bonus'), '10.00');
    assert.deepEqual(
      opened.entries.filter((entry) => entry.bookingId).map((entry) => [entry.bookingId, entry.amount]),
      [['JS001', '800.00'], ['JS002', '1000.00']],
    );

    const withLate = addShiftEntry(opened, {
      id: 'late',
      categoryId: 'ownBookings',
      amount: '850.00',
      recordedAt: now,
      bookingId: 'JS003',
    });
    const added = saveOpenedDay(both, withLate);
    const dayFive = loadDailyLogFromState(added, '2026-11-05');
    const daySix = loadDailyLogFromState(added, '2026-11-06');
    assert.equal(Number(dayFive?.ownBookings), 2650);
    assert.equal(dayFive?.ownBookingLines.find((line) => line.bookingId === 'JS003')?.amount, '850.00');
    assert.equal(dayFive?.ownBookingLines.find((line) => line.bookingId === 'JS001')?.amount, '800.00');
    assert.equal(daySix?.ownBookings, '500');
    assert.equal(daySix?.tips, '20.00');
    assert.equal(daySix?.ownBookingLines[0]?.bookingId, 'JS010');
    assert.equal(dayFive?.corrections?.some((entry) => entry.changes.some((change) => change.field === 'Bokning JS003' && change.after === '850.00')), true);
    const cleanFive = saveDailyLogToState(emptyTaxiLogState(), {
      date: '2026-11-05',
      grossIncome: '3000',
      tips: '40',
      workedHours: '9',
      ownBookings: '2650',
      handUp: '50',
      uberIncome: '200',
      boltIncome: '100',
      bonus: '10',
    });
    const cleanBoth = saveDailyLogToState(cleanFive, {
      date: '2026-11-06',
      grossIncome: '500',
      tips: '20',
      workedHours: '4',
      ownBookings: '500',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
    });
    assert.equal(added.payrolls.find((row) => row.month === 11)?.accruedSalary, cleanBoth.payrolls.find((row) => row.month === 11)?.accruedSalary);
    assert.equal(cleanBoth.dayCorrections.length, 0);

    const changed = updateShiftEntry(opened, 'booking-JS001', '900.00');
    const renamedAmount = saveOpenedDay(both, changed);
    const changedDay = loadDailyLogFromState(renamedAmount, '2026-11-05');
    assert.equal(Number(changedDay?.ownBookings), 1900);
    assert.notEqual(Number(changedDay?.ownBookings), 2700);
    assert.equal(changedDay?.ownBookingLines.length, 2);
    assert.equal(loadDailyLogFromState(renamedAmount, '2026-11-06')?.ownBookings, '500');

    const removed = removeShiftEntry(opened, 'booking-JS002');
    const withoutSecond = saveOpenedDay(both, removed);
    const removedDay = loadDailyLogFromState(withoutSecond, '2026-11-05');
    assert.equal(Number(removedDay?.ownBookings), 800);
    assert.equal(removedDay?.ownBookingLines.length, 1);
    assert.equal(removedDay?.ownBookingLines[0]?.bookingId, 'JS001');
    assert.equal(loadDailyLogFromState(withoutSecond, '2026-11-06')?.ownBookingLines[0]?.bookingId, 'JS010');

    const clash = addShiftEntry(draftFromSavedDay(loadDailyLogFromState(both, '2026-11-06')!, now), {
      id: 'clash',
      categoryId: 'ownBookings',
      amount: '100.00',
      recordedAt: now,
      bookingId: 'JS001',
    });
    assert.throws(() => saveOpenedDay(both, clash), /finns redan/);
    assert.equal(loadDailyLogFromState(both, '2026-11-05')?.ownBookingLines.length, 2);
    assert.equal(loadDailyLogFromState(both, '2026-11-06')?.ownBookings, '500');
  });

  it('I rejects a historical correction aimed at another date and cannot create a day', () => {
    const recordedAt = '2026-11-05T18:00:00.000Z';
    const saved = saveDailyLogToState(emptyTaxiLogState(), {
      date: '2026-11-05',
      grossIncome: '800',
      tips: '0',
      workedHours: '8',
      ownBookings: '800',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
      ownBookingLines: [{ bookingId: 'JS001', amount: '800', recordedAt }],
    });
    const opened = draftFromSavedDay(loadDailyLogFromState(saved, '2026-11-05')!, recordedAt);
    const moved = setShiftStart(opened, stockholmInputToInstant('2026-11-06T10:00')!);
    const planned = historicalCorrectionPlan(moved, recordedAt);
    assert.equal(planned.ok, false);
    assert.throws(
      () => saveDailyLogToState(saved, {
        date: '2026-11-06',
        grossIncome: '800',
        tips: '0',
        workedHours: '8',
        ownBookings: '800',
        handUp: '0',
        uberIncome: '0',
        boltIncome: '0',
        bonus: '0',
        correctingDate: '2026-11-05',
      }),
      /Korrigeringen gäller 2026-11-05/,
    );
    assert.throws(
      () => saveDailyLogToState(saved, {
        date: '2026-11-07',
        grossIncome: '100',
        tips: '0',
        workedHours: '1',
        ownBookings: '100',
        handUp: '0',
        uberIncome: '0',
        boltIncome: '0',
        bonus: '0',
        correctingDate: '2026-11-07',
      }),
      /kan inte skapa en ny dag/,
    );
    assert.equal(saved.workDays.length, 1);
    assert.equal(loadDailyLogFromState(saved, '2026-11-06'), null);
    assert.equal(loadDailyLogFromState(saved, '2026-11-07'), null);
    const newer = saveOpenedDay(saved, updateShiftEntry(opened, 'booking-JS001', '900.00'));
    assert.throws(() => saveOpenedDay(newer, opened), /ändrats sedan den öppnades/);
    assert.equal(Number(loadDailyLogFromState(newer, '2026-11-05')?.ownBookings), 900);
  });

  it('J keeps the draft when loading or saving fails', () => {
    const draft = addShiftEntry(setShiftStart(emptyTaxiShiftDraft(), '2026-11-05T07:00:00.000Z'), {
      id: 'a',
      categoryId: 'ownBookings',
      amount: '850.00',
      recordedAt: '2026-11-06T10:00:00.000Z',
      bookingId: 'JS003',
    });
    const failedLoad = applySavedDayLoad(draft, { ok: false }, '2026-11-06T10:00:00.000Z');
    assert.equal(failedLoad.opened, false);
    assert.equal(failedLoad.draft, draft);
    assert.match(failedLoad.error ?? '', /Ingenting ändrades/);
    const missing = applySavedDayLoad(draft, { ok: true, day: null }, '2026-11-06T10:00:00.000Z');
    assert.equal(missing.draft, draft);
    assert.equal(missing.opened, false);
    const failedSave = commitHistoricalCorrection(draft, { ok: false, message: 'Kunde inte spara ändringarna.' });
    assert.equal(failedSave.saved, false);
    assert.equal(failedSave.draft, draft);
    assert.equal(failedSave.draft.entries[0]?.bookingId, 'JS003');
    assert.equal(failedSave.draft.entries[0]?.amount, '850.00');
    assert.equal(draftHasUnsavedWork(draft), true);
  });

  it('K clears correction mode when a new empty day starts', () => {
    const opened = draftFromSavedDay({
      date: '2026-11-05',
      sourceCategorized: true,
      ownBookings: '800',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      tips: '0',
      bonus: '0',
      workedHours: '8',
      ownBookingLines: [{ bookingId: 'JS001', amount: '800.00', recordedAt: '2026-11-05T18:00:00.000Z' }],
    }, '2026-11-06T10:00:00.000Z');
    assert.equal(opened.correctingDate, '2026-11-05');
    assert.equal(startNewShiftDraft(opened, '2026-11-06'), opened);
    const fresh = beginEmptyShift('2026-11-06');
    assert.equal(fresh.correctingDate, null);
    assert.equal(fresh.historicalEditable, false);
    assert.equal(fresh.entries.length, 0);
    assert.equal(fresh.breaks.length, 0);
    assert.equal(fresh.startedAt, null);
    assert.equal(fresh.workDate, '2026-11-06');
    assert.equal(opened.entries[0]?.bookingId, 'JS001');
  });

  it('L keeps an overnight shift on the start date after a historical correction', () => {
    const startedAt = stockholmInputToInstant('2026-11-05T19:00');
    const endedAt = stockholmInputToInstant('2026-11-06T04:00');
    assert.ok(startedAt);
    assert.ok(endedAt);
    const first = saveDailyLogToState(emptyTaxiLogState(), {
      date: '2026-11-05',
      grossIncome: '400',
      tips: '0',
      workedHours: '9',
      ownBookings: '400',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
      ownBookingLines: [{ bookingId: 'JS020', amount: '400', recordedAt: startedAt }],
    });
    const both = saveDailyLogToState(first, {
      date: '2026-11-06',
      grossIncome: '100',
      tips: '0',
      workedHours: '2',
      ownBookings: '100',
      handUp: '0',
      uberIncome: '0',
      boltIncome: '0',
      bonus: '0',
      ownBookingLines: [{ bookingId: 'JS021', amount: '100', recordedAt: endedAt }],
    });
    const opened = setShiftEnd(
      setShiftStart(draftFromSavedDay(loadDailyLogFromState(both, '2026-11-05')!, endedAt), startedAt),
      endedAt,
    );
    const planned = historicalCorrectionPlan(opened, endedAt);
    assert.equal(planned.ok, true);
    if (!planned.ok) return;
    assert.equal(planned.plan.date, '2026-11-05');
    assert.equal(planned.plan.workedHours, '9.00');
    const saved = saveOpenedDay(both, opened);
    assert.equal(loadDailyLogFromState(saved, '2026-11-05')?.date, '2026-11-05');
    assert.equal(Number(loadDailyLogFromState(saved, '2026-11-05')?.workedHours), 9);
    assert.equal(loadDailyLogFromState(saved, '2026-11-05')?.ownBookingLines[0]?.bookingId, 'JS020');
    assert.equal(loadDailyLogFromState(saved, '2026-11-06')?.ownBookings, '100');
    assert.equal(loadDailyLogFromState(saved, '2026-11-06')?.ownBookingLines[0]?.bookingId, 'JS021');
  });
});

function saveOpenedDay(state: ReturnType<typeof emptyTaxiLogState>, draft: ReturnType<typeof draftFromSavedDay>) {
  const planned = historicalCorrectionPlan(draft, '2026-11-06T12:00:00.000Z');
  if (!planned.ok) throw new Error(planned.reason);
  const parsed = parseTaxiLogImport(planned.plan.text);
  const lines = ownBookingLinesFromDraft(draft, planned.plan.date);
  if (!lines.ok) throw new Error(lines.reason);
  return saveDailyLogToState(state, {
    date: parsed.date,
    grossIncome: parsed.grossIncome,
    tips: parsed.tips,
    workedHours: parsed.workedHours,
    ownBookings: parsed.ownBookings,
    otherIncome: parsed.otherIncome,
    handUp: parsed.handUp,
    uberIncome: parsed.uberIncome,
    boltIncome: parsed.boltIncome,
    bonus: parsed.bonus,
    correctingDate: planned.plan.date,
    openedFingerprint: draft.openedFingerprint,
    ownBookingLines: lines.lines,
  });
}

function lockedPayroll(): TaxiPayrollRecord {
  return {
    year: 2026,
    month: 11,
    periodStart: '2026-11-01',
    periodEnd: '2026-11-30',
    totalWorkDays: 0,
    totalWorkHours: '0',
    totalIncome: '0.00',
    totalTips: '0.00',
    vatRate: '0.06',
    totalVat: '0.00',
    totalIncomeExVat: '0.00',
    totalCosts: '0.00',
    accruedSalary: '0.00',
    salaryStatus: 'open',
    paymentDate: null,
    paidAmount: '0.00',
    remainingAmount: '0.00',
    settlementLocked: true,
    settlementLockedAt: '2026-11-30T00:00:00.000Z',
  };
}
