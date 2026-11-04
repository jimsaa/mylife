import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest } from '@vercel/node';
import { ADMIN_SESSION_COOKIE, createSessionCookieValue } from '../../temp-gate';
import { createMemoryTaxiLogBlobIO, setTaxiLogBlobIOForTests } from '../../taxi-log-store';
import { emptyTaxiLogState, type TaxiLogState, type TaxiWorkDayRecord } from '../service';
import { buildTaxiLogReport } from './taxiLogReport';
import handler from '../../../taxi-log/report';

function workDay(overrides: Partial<TaxiWorkDayRecord> & Pick<TaxiWorkDayRecord, 'date'>): TaxiWorkDayRecord {
  return {
    workHours: '0',
    totalIncome: '0.00',
    ownBookings: '0.00',
    otherIncome: null,
    handUp: '0.00',
    uberIncome: '0.00',
    boltIncome: '0.00',
    tips: '0.00',
    bonus: '0.00',
    vatRate: '6',
    vatAmount: '999.00',
    incomeExVat: '999.00',
    totalCosts: '0',
    totalKm: '0',
    numberOfTrips: 0,
    ...overrides,
  };
}

function state(days: TaxiWorkDayRecord[]): TaxiLogState {
  return { ...emptyTaxiLogState(), workDays: days };
}

describe('TaxiLog report summary', () => {
  it('keeps unknown categories unknown and keeps a real zero', () => {
    const unknown = buildTaxiLogReport(
      state([
        workDay({
          date: '2026-09-18',
          workHours: '8',
          ownBookings: null,
          handUp: null,
          uberIncome: null,
          boltIncome: null,
          bonus: null,
          tips: '0',
        }),
      ]),
      '2026-09-18',
    );
    assert.equal(unknown.day.ownBookings, null);
    assert.equal(unknown.day.drivingGross, null);
    assert.equal(unknown.day.bonus, null);
    assert.equal(unknown.day.totalIncome, null);
    assert.equal(unknown.day.incomePerHour, null);
    assert.equal(unknown.day.tips, '0.00');

    const zero = buildTaxiLogReport(
      state([
        workDay({
          date: '2026-11-04',
          workHours: '8',
          ownBookings: '0.00',
          handUp: '0.00',
          uberIncome: '0.00',
          boltIncome: '0.00',
          bonus: '0.00',
          tips: '0.00',
        }),
      ]),
      '2026-11-04',
    );
    assert.equal(zero.day.ownBookings, '0.00');
    assert.equal(zero.day.drivingGross, '0.00');
    assert.equal(zero.day.bonus, '0.00');
    assert.equal(zero.day.totalIncome, '0.00');
    assert.equal(zero.day.incomePerHour, '0.00');
  });

  it('includes the Monday-Sunday week across the month boundary and omits salary fields', () => {
    const report = buildTaxiLogReport(
      state([
        workDay({
          date: '2026-10-25',
          workHours: '9',
          ownBookings: '999.00',
          handUp: '0.00',
          uberIncome: '0.00',
          boltIncome: '0.00',
          bonus: '999.00',
          tips: '1.00',
        }),
        workDay({
          date: '2026-10-30',
          workHours: '4',
          ownBookings: '100.00',
          handUp: '0.00',
          uberIncome: '0.00',
          boltIncome: '0.00',
          bonus: null,
          tips: '0.00',
        }),
        workDay({
          date: '2026-11-01',
          workHours: '2',
          ownBookings: '50.00',
          handUp: '0.00',
          uberIncome: '0.00',
          boltIncome: '0.00',
          bonus: '0.00',
          tips: '10.00',
        }),
        workDay({
          date: '2026-11-02',
          workHours: '1',
          ownBookings: '7.00',
          handUp: '0.00',
          uberIncome: '0.00',
          boltIncome: '0.00',
          bonus: '0.00',
          tips: '0.00',
        }),
      ]),
      '2026-11-01',
    );

    assert.equal(report.reportDate, '2026-11-01');
    assert.deepEqual(
      { start: report.week.periodStart, end: report.week.periodEnd },
      { start: '2026-10-26', end: '2026-11-01' },
    );
    assert.equal(report.day.ownBookings, '50.00');
    assert.equal(report.day.drivingGross, '50.00');
    assert.equal(report.day.bonus, '0.00');
    assert.equal(report.day.tips, '10.00');
    assert.equal(report.day.totalIncome, '60.00');
    assert.equal(report.day.workedHours, '2');
    assert.equal(report.day.incomePerHour, '25.00');

    assert.equal(report.week.ownBookings, '150.00');
    assert.equal(report.week.drivingGross, '150.00');
    assert.equal(report.week.bonus, null);
    assert.equal(report.week.totalIncome, null);
    assert.equal(report.week.workedHours, '6');
    assert.equal(report.week.incomePerHour, '25.00');

    assert.equal(report.month.periodStart, '2026-11-01');
    assert.equal(report.month.periodEnd, '2026-11-30');
    assert.equal(report.month.ownBookings, '57.00');
    assert.equal(report.month.drivingGross, '57.00');
    assert.equal(report.month.bonus, '0.00');
    assert.equal(report.month.tips, '10.00');
    assert.equal(report.month.totalIncome, '67.00');
    assert.equal(report.month.workedHours, '3');
    assert.equal(report.month.incomePerHour, '19.00');

    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes('999'), false);
    assert.equal(serialized.includes('vat'), false);
    assert.equal(serialized.includes('accruedSalary'), false);
    assert.equal(serialized.includes('savings'), false);
  });
});

function mockResponse() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

function request(method: string, body: unknown, origin = 'http://localhost:3000'): VercelRequest {
  return {
    method,
    body,
    query: {},
    headers: {
      origin,
      host: 'localhost:3000',
      cookie: `${ADMIN_SESSION_COOKIE}=${createSessionCookieValue()}`,
    },
  } as VercelRequest;
}

describe('TaxiLog report route', () => {
  afterEach(() => {
    setTaxiLogBlobIOForTests(null);
  });

  it('rejects missing auth, non-POST, and a foreign Origin without writing', async () => {
    const io = createMemoryTaxiLogBlobIO();
    setTaxiLogBlobIOForTests(io);
    const unauthenticated = request('POST', { date: '2026-11-01' });
    unauthenticated.headers.cookie = '';
    const denied = mockResponse();
    await handler(unauthenticated, denied as never);
    assert.equal(denied.statusCode, 401);
    assert.equal(io.puts.length, 0);

    const wrongMethod = mockResponse();
    await handler(request('GET', {}), wrongMethod as never);
    assert.equal(wrongMethod.statusCode, 405);
    assert.equal(io.puts.length, 0);

    const foreign = mockResponse();
    await handler(request('POST', { date: '2026-11-01' }, 'https://evil.example'), foreign as never);
    assert.equal(foreign.statusCode, 403);
    assert.equal(io.puts.length, 0);
  });

  it('reads stored days without seeding or writing and returns the report', async () => {
    const stored = state([
      workDay({
        date: '2026-11-04',
        workHours: '8',
        ownBookings: '1000.00',
        handUp: '500.00',
        uberIncome: '1200.00',
        boltIncome: '800.00',
        bonus: '200.00',
        tips: '100.00',
      }),
    ]);
    const io = createMemoryTaxiLogBlobIO({ privateBody: JSON.stringify(stored) });
    setTaxiLogBlobIOForTests(io);

    const empty = mockResponse();
    await handler(request('POST', { date: '2026-09-18' }), empty as never);
    assert.equal(empty.statusCode, 400);
    assert.equal(io.puts.length, 0);

    const ok = mockResponse();
    await handler(request('POST', { date: '2026-11-04', email: 'tobbe@example.com' }), ok as never);
    assert.equal(ok.statusCode, 200);
    const report = ok.body as { reportDate: string; day: { drivingGross: string; incomePerHour: string; bonus: string; tips: string } };
    assert.equal(report.reportDate, '2026-11-04');
    assert.equal(report.day.drivingGross, '3500.00');
    assert.equal(report.day.bonus, '200.00');
    assert.equal(report.day.tips, '100.00');
    assert.equal(report.day.incomePerHour, '437.50');
    assert.equal(JSON.stringify(ok.body).includes('tobbe@example.com'), false);
    assert.equal(JSON.stringify(ok.body).includes('vat'), false);
    assert.equal(io.puts.length, 0);
  });
});
