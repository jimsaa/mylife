import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseTaxiLogImport } from './import/taxilogImport.ts';
import { emptyTaxiLogState, saveDailyLogToState, type TaxiPayrollRecord } from './service.ts';
import {
  addBreak,
  addShiftEntry,
  calculateReportedWork,
  cashTotal,
  categorySharePercent,
  categorySum,
  drivingGross,
  emptyTaxiShiftDraft,
  endShift,
  formatWorkDuration,
  instantToStockholmInput,
  loadTaxiShiftDraft,
  markShiftClosed,
  planShiftClose,
  reopenShiftForCorrection,
  reportedHoursValue,
  editShiftAmountInput,
  normalizeStockholmTime,
  parseBookingIds,
  parseShiftAmount,
  stockholmFieldsToInstant,
  removeBreak,
  removeShiftEntry,
  resumeBreak,
  saveTaxiShiftDraft,
  setShiftEnd,
  setShiftStart,
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
    assert.equal(oldDraft.entries[0]?.bookingIds, undefined);
    assert.equal(oldDraft.entries[1]?.bookingIds, undefined);
    assert.equal(categorySum(oldDraft, 'ownBookings'), '1800.00');
    assert.equal(drivingGross(oldDraft), '1900.00');
    const invalid = calculateReportedWork(
      { ...compatible, endedAt: '2026-11-05T06:00:00.000Z' },
      '2026-11-05T08:00:00.000Z',
    );
    assert.deepEqual(invalid, { shiftMs: 0, breakMs: 0, reportedMs: 0 });
  });

  it('stores several booking ids on an own booking and ignores them in the totals', () => {
    assert.equal(parseBookingIds('JS001, JS002'), 'JS001, JS002');
    assert.equal(parseBookingIds(' JS001,JS002 '), 'JS001, JS002');
    assert.equal(parseBookingIds(''), null);
    assert.equal(parseBookingIds('JS 001'), null);

    let draft = startShift(emptyTaxiShiftDraft(), '2026-11-05T03:45:00.000Z');
    draft = addShiftEntry(draft, {
      id: 'own-1',
      categoryId: 'ownBookings',
      amount: '1800.00',
      recordedAt: '2026-11-05T08:00:00.000Z',
      bookingIds: 'JS001,JS002',
    });
    draft = addShiftEntry(draft, {
      id: 'uber-1',
      categoryId: 'uberIncome',
      amount: '200.00',
      recordedAt: '2026-11-05T09:00:00.000Z',
      bookingIds: 'NOPE',
    });
    assert.equal(draft.entries[0]?.bookingIds, 'JS001, JS002');
    assert.equal(draft.entries[1]?.bookingIds, undefined);
    assert.equal(categorySum(draft, 'ownBookings'), '1800.00');
    assert.equal(categorySharePercent(draft, 'ownBookings'), '90');
    const before = calculateReportedWork(draft, '2026-11-05T15:45:00.000Z');

    draft = updateShiftEntry(draft, 'own-1', '1800.00', 'JS001, JS003');
    assert.equal(draft.entries[0]?.bookingIds, 'JS001, JS003');
    assert.deepEqual(calculateReportedWork(draft, '2026-11-05T15:45:00.000Z'), before);

    const storage = memoryStorage();
    saveTaxiShiftDraft(storage, draft);
    const loaded = loadTaxiShiftDraft(storage);
    assert.equal(loaded.entries[0]?.bookingIds, 'JS001, JS003');
    assert.equal(loaded.entries[0]?.amount, '1800.00');

    draft = updateShiftEntry(draft, 'own-1', '1800.00', null);
    assert.equal(draft.entries[0]?.bookingIds, undefined);
    draft = removeShiftEntry(draft, 'own-1');
    assert.equal(draft.entries.some((entry) => entry.id === 'own-1'), false);
    saveTaxiShiftDraft(storage, draft);
    assert.equal(loadTaxiShiftDraft(storage).entries.some((entry) => entry.bookingIds), false);
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
      bookingIds: 'JS001, JS002',
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
    assert.equal(draft.entries[0]?.bookingIds, 'JS001, JS002');
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
    assert.equal(loaded.entries[0]?.bookingIds, 'JS001, JS002');
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
      bookingIds: 'JS001, JS002',
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
    assert.equal(draft.entries.find((entry) => entry.id === 'own-1')?.bookingIds, 'JS001, JS002');

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
    assert.equal(cleared.entries.find((entry) => entry.id === 'own-1')?.bookingIds, 'JS001, JS002');

    const closed = markShiftClosed(draft, '2026-11-05T16:05:00.000Z', planned.plan.date);
    assert.equal(closed.closedDate, '2026-11-05');
    assert.equal(closed.entries.find((entry) => entry.id === 'own-1')?.bookingIds, 'JS001, JS002');
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
    assert.equal(loadTaxiShiftDraft(stored).entries[0]?.bookingIds, 'JS001, JS002');

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
});

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
