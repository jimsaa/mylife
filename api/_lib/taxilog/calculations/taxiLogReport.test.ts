import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { VercelRequest } from '@vercel/node';
import { ADMIN_SESSION_COOKIE, createSessionCookieValue } from '../../temp-gate';
import { createMemoryTaxiLogBlobIO, setTaxiLogBlobIOForTests } from '../../taxi-log-store';
import { emptyTaxiLogState, type TaxiLogState, type TaxiWorkDayRecord } from '../service';
import { buildTaxiLogReport } from './taxiLogReport';
import { handleTaxiLogReport } from '../reportHandler';

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

const EMAIL_ENV_KEYS = ['EMAIL_PROVIDER', 'RESEND_API_KEY', 'EMAIL_FROM', 'TAXILOG_REPORT_TO'] as const;

function useEmailEnv(): () => void {
  const previous = Object.fromEntries(EMAIL_ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.EMAIL_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'TaxiLog <reports@example.com>';
  process.env.TAXILOG_REPORT_TO = 'report-test@example.com';
  return () => {
    for (const key of EMAIL_ENV_KEYS) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
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
    await handleTaxiLogReport(unauthenticated, denied as never);
    assert.equal(denied.statusCode, 401);
    assert.equal(io.puts.length, 0);

    const wrongMethod = mockResponse();
    await handleTaxiLogReport(request('GET', {}), wrongMethod as never);
    assert.equal(wrongMethod.statusCode, 405);
    assert.equal(io.puts.length, 0);

    const foreign = mockResponse();
    await handleTaxiLogReport(request('POST', { date: '2026-11-01' }, 'https://evil.example'), foreign as never);
    assert.equal(foreign.statusCode, 403);
    assert.equal(io.puts.length, 0);
  });

  it('does not send when the date is missing or email is not configured', async () => {
    const stored = state([
      workDay({
        date: '2026-11-04',
        workHours: '8',
        ownBookings: '1000.00',
        handUp: '0.00',
        uberIncome: '0.00',
        boltIncome: '0.00',
        bonus: null,
        tips: '0.00',
      }),
    ]);
    const io = createMemoryTaxiLogBlobIO({ privateBody: JSON.stringify(stored) });
    setTaxiLogBlobIOForTests(io);
    let fetchCalls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      fetchCalls += 1;
      return new Response('{}', { status: 200 });
    };
    const restoreEnv = useEmailEnv();
    delete process.env.EMAIL_PROVIDER;

    try {
      const missingDay = mockResponse();
      await handleTaxiLogReport(request('POST', { date: '2026-09-18' }), missingDay as never);
      assert.equal(missingDay.statusCode, 400);
      assert.match(String((missingDay.body as { error: string }).error), /Ingen registrerad arbetsdag/);

      const invalid = mockResponse();
      await handleTaxiLogReport(request('POST', { date: '2026-13-40' }), invalid as never);
      assert.equal(invalid.statusCode, 400);
      assert.match(String((invalid.body as { error: string }).error), /Ogiltigt datum/);

      const unconfigured = mockResponse();
      await handleTaxiLogReport(request('POST', { date: '2026-11-04' }), unconfigured as never);
      assert.equal(unconfigured.statusCode, 400);
      assert.match(String((unconfigured.body as { error: string }).error), /EMAIL_PROVIDER=resend/);
      assert.equal(fetchCalls, 0);
      assert.equal(io.puts.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnv();
    }
  });

  it('sends only the approved report when Resend accepts it', async () => {
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
        vatAmount: '999.00',
        incomeExVat: '999.00',
      }),
    ]);
    const io = createMemoryTaxiLogBlobIO({ privateBody: JSON.stringify(stored) });
    setTaxiLogBlobIOForTests(io);
    const sentBodies: Array<{ to: string[]; subject: string; text: string; html: string }> = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      sentBodies.push(JSON.parse(String(init?.body)));
      return new Response('{}', { status: 200 });
    };
    const restoreEnv = useEmailEnv();

    try {
      const ok = mockResponse();
      await handleTaxiLogReport(request('POST', { date: '2026-11-04', email: 'tobbe@example.com' }), ok as never);
      assert.equal(ok.statusCode, 200);
      assert.deepEqual(ok.body, { sent: true, recipient: 'report-test@example.com' });
      assert.equal(sentBodies.length, 1);
      assert.deepEqual(sentBodies[0]?.to, ['report-test@example.com']);
      assert.equal(sentBodies[0]?.subject, 'TaxiLog – rapport 2026-11-04');
      const text = sentBodies[0]?.text ?? '';
      assert.match(text, /Egna bokningar: 1 000 kr/);
      assert.match(text, /Hand Up: 500 kr/);
      assert.match(text, /Uber: 1 200 kr/);
      assert.match(text, /Bolt: 800 kr/);
      assert.match(text, /Bonus: 200 kr/);
      assert.match(text, /Dricks: 100 kr/);
      assert.match(text, /Arbetade timmar: 8 h/);
      assert.match(text, /Intäkt per arbetad timme: 437,50 kr/);
      assert.equal(text.includes('tobbe@example.com'), false);
      assert.equal(text.includes('999'), false);
      assert.equal(text.includes('moms'), false);
      assert.equal(text.includes('skatt'), false);
      assert.equal(text.includes('sparande'), false);
      assert.equal(text.includes('avräkning'), false);
      assert.equal(io.puts.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnv();
    }
  });

  it('reports a Resend rejection and does not claim the mail was sent', async () => {
    const stored = state([
      workDay({
        date: '2026-11-04',
        workHours: '8',
        ownBookings: '1.00',
        handUp: '0.00',
        uberIncome: '0.00',
        boltIncome: '0.00',
        bonus: '0.00',
        tips: '0.00',
      }),
    ]);
    const io = createMemoryTaxiLogBlobIO({ privateBody: JSON.stringify(stored) });
    setTaxiLogBlobIOForTests(io);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('nope', { status: 422 });
    const restoreEnv = useEmailEnv();

    try {
      const rejected = mockResponse();
      await handleTaxiLogReport(request('POST', { date: '2026-11-04' }), rejected as never);
      assert.equal(rejected.statusCode, 502);
      assert.equal((rejected.body as { error: string }).error, 'Resend avvisade mejlet.');
      assert.equal(JSON.stringify(rejected.body).includes('"sent":true'), false);
      assert.equal(io.puts.length, 0);
    } finally {
      globalThis.fetch = originalFetch;
      restoreEnv();
    }
  });
});
