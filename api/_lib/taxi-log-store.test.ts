import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  TAXI_LOG_BLOB_ACCESS,
  TAXI_LOG_BLOB_GET_OPTIONS,
  TAXI_LOG_BLOB_PATH,
  TAXI_LOG_BLOB_PUBLIC_FALLBACK_GET_OPTIONS,
  TAXI_LOG_BLOB_PUT_OPTIONS,
  addSavings,
  createMemoryTaxiLogBlobIO,
  getDay,
  getMonth,
  saveDay,
  setTaxiLogBlobIOForTests,
  settleMonth,
  textFromBlobGetResult,
} from './taxi-log-store';
import { emptyTaxiLogState, type TaxiLogState } from './taxilog/service';

const HISTORICAL_STATE: TaxiLogState = {
  ...emptyTaxiLogState(),
  workDays: [
    {
      date: '2026-09-18',
      workHours: '10.5',
      totalIncome: '2235.00',
      ownBookings: null,
      otherIncome: null,
      handUp: null,
      uberIncome: null,
      boltIncome: null,
      tips: '0',
      bonus: null,
      vatRate: '6',
      vatAmount: '134.10',
      incomeExVat: '2100.90',
      totalCosts: '0',
      totalKm: '0',
      numberOfTrips: 0,
    },
  ],
  payrolls: [
    {
      year: 2026,
      month: 9,
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      totalWorkDays: 1,
      totalWorkHours: '10.5',
      totalIncome: '2235.00',
      totalTips: '0',
      vatRate: '6',
      totalVat: '134.10',
      totalIncomeExVat: '2100.90',
      totalCosts: '0',
      accruedSalary: '987.42',
      salaryStatus: 'ACCRUING',
      paymentDate: null,
      paidAmount: '0',
      remainingAmount: '987.42',
      settlementLocked: false,
      settlementLockedAt: null,
    },
  ],
  savingsLedger: [
    {
      id: 'sav-1',
      occurredAt: '2026-09-18',
      year: 2026,
      month: 9,
      kind: 'TIPS',
      amount: '50.00',
      sourceKey: 'tips:2026-09-18',
      description: 'Tips',
    },
  ],
};

function leakStrings(io: ReturnType<typeof createMemoryTaxiLogBlobIO>): string[] {
  return [io.putReturnValue.url, io.putReturnValue.downloadUrl];
}

function assertNoBlobUrlLeak(payload: unknown, io: ReturnType<typeof createMemoryTaxiLogBlobIO>) {
  const serialized = JSON.stringify(payload);
  for (const leak of leakStrings(io)) {
    assert.equal(serialized.includes(leak), false, `blob URL leaked: ${leak}`);
  }
  assert.equal(serialized.includes('blob.vercel-storage.com'), false);
  assert.equal(serialized.includes('downloadUrl'), false);
}

afterEach(() => {
  setTaxiLogBlobIOForTests(null);
});

describe('TaxiLog private Blob store', () => {
  it('uses a private blob path and never public put access', () => {
    assert.equal(TAXI_LOG_BLOB_PATH, 'taxi-log/state.json');
    assert.equal(TAXI_LOG_BLOB_ACCESS, 'private');
    assert.equal(TAXI_LOG_BLOB_GET_OPTIONS.access, 'private');
    assert.equal(TAXI_LOG_BLOB_GET_OPTIONS.useCache, false);
    assert.equal(TAXI_LOG_BLOB_PUT_OPTIONS.access, 'private');
    assert.equal(TAXI_LOG_BLOB_PUT_OPTIONS.addRandomSuffix, false);
    assert.equal(TAXI_LOG_BLOB_PUT_OPTIONS.allowOverwrite, true);
    assert.equal(TAXI_LOG_BLOB_PUT_OPTIONS.contentType, 'application/json');
    assert.equal(TAXI_LOG_BLOB_PUT_OPTIONS.cacheControlMaxAge, 60);
    assert.notEqual(TAXI_LOG_BLOB_PUT_OPTIONS.access, 'public');
    assert.equal(JSON.stringify(TAXI_LOG_BLOB_PUT_OPTIONS).includes('"public"'), false);
    assert.equal(TAXI_LOG_BLOB_PUBLIC_FALLBACK_GET_OPTIONS.access, 'public');
    assert.equal(TAXI_LOG_BLOB_PUBLIC_FALLBACK_GET_OPTIONS.useCache, false);
  });

  it('reads private first and skips the public fallback when private get returns a body', async () => {
    const io = createMemoryTaxiLogBlobIO({
      privateBody: JSON.stringify(HISTORICAL_STATE),
      publicBody: JSON.stringify({ ...HISTORICAL_STATE, workDays: [] }),
    });
    setTaxiLogBlobIOForTests(io);

    const result = await getDay('2026-09-18');
    assert.equal(io.privateReads, 1);
    assert.equal(io.publicReads, 0);
    assert.equal(result.day?.grossIncome, '2235.00');
    assert.equal(result.day?.ownBookings, null);
    assertNoBlobUrlLeak(result, io);
  });

  it('uses the public fallback only when private get returns null', async () => {
    const io = createMemoryTaxiLogBlobIO({
      privateBody: null,
      publicBody: JSON.stringify(HISTORICAL_STATE),
    });
    setTaxiLogBlobIOForTests(io);

    const result = await getDay('2026-09-18');
    assert.equal(io.privateReads, 1);
    assert.equal(io.publicReads, 1);
    assert.equal(result.day?.grossIncome, '2235.00');
    assert.equal(io.puts.length, 0);
  });

  it('round-trips workDays, payrolls and savings without leaking blob URLs', async () => {
    const io = createMemoryTaxiLogBlobIO({
      privateBody: JSON.stringify(HISTORICAL_STATE),
    });
    setTaxiLogBlobIOForTests(io);

    const saved = await saveDay({
      date: '2026-11-03',
      grossIncome: '3500',
      tips: '100',
      workedHours: '8',
      ownBookings: '1000',
      handUp: '500',
      uberIncome: '1200',
      boltIncome: '800',
      bonus: '200',
    });
    const settled = await settleMonth(2026, 11);
    const savings = await addSavings({
      date: '2026-11-03',
      amount: '25',
      kind: 'MANUAL_DEPOSIT',
      description: 'test deposit',
    });

    assert.ok(io.puts.length >= 3);
    const stored = JSON.parse(io.puts[io.puts.length - 1] as string) as TaxiLogState;
    assert.equal(stored.workDays.some((day) => day.date === '2026-09-18'), true);
    assert.equal(stored.workDays.some((day) => day.date === '2026-11-03'), true);
    const november = stored.workDays.find((day) => day.date === '2026-11-03');
    assert.equal(november?.handUp, '500');
    assert.equal(november?.uberIncome, '1200');
    assert.equal(november?.boltIncome, '800');
    assert.ok(stored.payrolls.length > 0);
    assert.ok(stored.savingsLedger.some((entry) => entry.kind === 'TIPS'));
    assert.ok(stored.savingsLedger.some((entry) => entry.description === 'test deposit'));
    assert.equal(JSON.stringify(stored).includes(io.putReturnValue.url), false);
    assert.equal(JSON.stringify(stored).includes(io.putReturnValue.downloadUrl), false);

    assertNoBlobUrlLeak(saved, io);
    assertNoBlobUrlLeak(settled, io);
    assertNoBlobUrlLeak(savings, io);
  });

  it('treats SDK null as missing and does not treat 304 as missing', async () => {
    assert.equal(await textFromBlobGetResult(null), null);

    await assert.rejects(
      () =>
        textFromBlobGetResult({
          statusCode: 304,
          stream: null,
          headers: new Headers(),
          blob: {
            url: 'https://example.invalid/taxi-log/state.json',
            downloadUrl: 'https://example.invalid/taxi-log/state.json',
            pathname: TAXI_LOG_BLOB_PATH,
            contentDisposition: '',
            cacheControl: '',
            uploadedAt: new Date(),
            etag: 'etag',
            contentType: null,
            size: null,
          },
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /304/);
        assert.equal(error.message.includes('example.invalid'), false);
        return true;
      },
    );

    await assert.rejects(
      () =>
        textFromBlobGetResult({
          statusCode: 200,
          stream: null as unknown as ReadableStream<Uint8Array>,
          headers: new Headers(),
          blob: {
            url: 'https://example.invalid/taxi-log/state.json',
            downloadUrl: 'https://example.invalid/taxi-log/state.json',
            pathname: TAXI_LOG_BLOB_PATH,
            contentDisposition: '',
            cacheControl: '',
            uploadedAt: new Date(),
            etag: 'etag',
            contentType: 'application/json',
            size: 2,
          },
        }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /unusable response/);
        assert.equal(error.message.includes('example.invalid'), false);
        return true;
      },
    );

    const stream = new Response('{"workDays":[]}').body;
    assert.ok(stream);
    const text = await textFromBlobGetResult({
      statusCode: 200,
      stream,
      headers: new Headers(),
      blob: {
        url: 'https://example.invalid/taxi-log/state.json',
        downloadUrl: 'https://example.invalid/taxi-log/state.json',
        pathname: TAXI_LOG_BLOB_PATH,
        contentDisposition: '',
        cacheControl: '',
        uploadedAt: new Date(),
        etag: 'etag',
        contentType: 'application/json',
        size: 15,
      },
    });
    assert.equal(text, '{"workDays":[]}');
  });

  it('does not call public GET when private GET is 304, unusable, or throws', async () => {
    const notModified = createMemoryTaxiLogBlobIO({
      publicBody: JSON.stringify(HISTORICAL_STATE),
    });
    notModified.getPrivate = async () =>
      textFromBlobGetResult({
        statusCode: 304,
        stream: null,
        headers: new Headers(),
        blob: {
          url: 'https://example.invalid/taxi-log/state.json',
          downloadUrl: 'https://example.invalid/taxi-log/state.json',
          pathname: TAXI_LOG_BLOB_PATH,
          contentDisposition: '',
          cacheControl: '',
          uploadedAt: new Date(),
          etag: 'etag',
          contentType: null,
          size: null,
        },
      });
    setTaxiLogBlobIOForTests(notModified);
    await assert.rejects(() => getDay('2026-09-18'));
    assert.equal(notModified.publicReads, 0);

    const unusable = createMemoryTaxiLogBlobIO({
      publicBody: JSON.stringify(HISTORICAL_STATE),
    });
    unusable.getPrivate = async () =>
      textFromBlobGetResult({
        statusCode: 200,
        stream: null as unknown as ReadableStream<Uint8Array>,
        headers: new Headers(),
        blob: {
          url: 'https://example.invalid/taxi-log/state.json',
          downloadUrl: 'https://example.invalid/taxi-log/state.json',
          pathname: TAXI_LOG_BLOB_PATH,
          contentDisposition: '',
          cacheControl: '',
          uploadedAt: new Date(),
          etag: 'etag',
          contentType: 'application/json',
          size: 1,
        },
      });
    setTaxiLogBlobIOForTests(unusable);
    await assert.rejects(() => getDay('2026-09-18'));
    assert.equal(unusable.publicReads, 0);

    const thrown = createMemoryTaxiLogBlobIO({
      publicBody: JSON.stringify(HISTORICAL_STATE),
    });
    thrown.getPrivate = async () => {
      throw new Error('upstream blob failure');
    };
    setTaxiLogBlobIOForTests(thrown);
    await assert.rejects(() => getDay('2026-09-18'), /upstream blob failure/);
    assert.equal(thrown.publicReads, 0);
  });

  it('does not seed or overwrite when list fails', async () => {
    const io = createMemoryTaxiLogBlobIO({
      privateBody: JSON.stringify(HISTORICAL_STATE),
    });
    io.listError = new Error('list failed');
    setTaxiLogBlobIOForTests(io);

    const month = await getMonth(2026, 9);
    assert.equal(io.listCalls, 1);
    assert.equal(io.puts.length, 0);
    assert.equal(month.grossIncome, '2235');
    assert.equal(io.privateBody, JSON.stringify(HISTORICAL_STATE));
    assertNoBlobUrlLeak(month, io);
  });
});
