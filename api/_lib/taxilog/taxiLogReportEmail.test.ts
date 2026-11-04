import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTaxiLogReport } from './calculations/taxiLogReport';
import { emptyTaxiLogState, type TaxiLogState, type TaxiWorkDayRecord } from './service';
import {
  formatTaxiLogReportEmail,
  readTaxiLogEmailSettings,
  sendTaxiLogReportEmail,
} from './taxiLogReportEmail';

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
    incomeExVat: '888.00',
    totalCosts: '0',
    totalKm: '0',
    numberOfTrips: 0,
    ...overrides,
  };
}

describe('TaxiLog report email', () => {
  it('shows unknown values and real zeroes differently', () => {
    const state: TaxiLogState = {
      ...emptyTaxiLogState(),
      workDays: [
        workDay({
          date: '2026-11-04',
          workHours: '0',
          ownBookings: null,
          handUp: '0.00',
          uberIncome: null,
          boltIncome: null,
          bonus: null,
          tips: '0.00',
        }),
      ],
    };
    const message = formatTaxiLogReportEmail(buildTaxiLogReport(state, '2026-11-04'));
    assert.match(message.text, /Egna bokningar: Ej registrerat/);
    assert.match(message.text, /Hand Up: 0 kr/);
    assert.match(message.text, /Bonus: Ej registrerat/);
    assert.match(message.text, /Dricks: 0 kr/);
    assert.match(message.text, /Arbetade timmar: 0 h/);
    assert.match(message.text, /Intäkt per arbetad timme: Ej registrerat/);
    assert.equal(message.text.includes('999'), false);
    assert.equal(message.text.includes('888'), false);
    assert.equal(message.html.includes('Ej registrerat'), true);
    assert.equal(message.subject, 'TaxiLog – rapport 2026-11-04');
  });

  it('rejects console logging and incomplete Resend settings', () => {
    assert.match(readTaxiLogEmailSettings({ EMAIL_PROVIDER: 'console' }).error ?? '', /EMAIL_PROVIDER=resend/);
    assert.match(readTaxiLogEmailSettings({}).error ?? '', /EMAIL_PROVIDER=resend/);
    assert.equal(
      readTaxiLogEmailSettings({ EMAIL_PROVIDER: 'resend' }).error,
      'RESEND_API_KEY saknas.',
    );
    assert.equal(
      readTaxiLogEmailSettings({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 'key' }).error,
      'EMAIL_FROM saknas.',
    );
    assert.equal(
      readTaxiLogEmailSettings({
        EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 'key',
        EMAIL_FROM: 'TaxiLog <reports@example.com>',
      }).error,
      'TAXILOG_REPORT_TO saknas.',
    );
  });

  it('returns failure when Resend rejects and success only when Resend accepts', async () => {
    const report = buildTaxiLogReport(
      {
        ...emptyTaxiLogState(),
        workDays: [workDay({ date: '2026-11-04', workHours: '2', ownBookings: '10.00' })],
      },
      '2026-11-04',
    );
    const settings = {
      to: 'report-test@example.com',
      from: 'TaxiLog <reports@example.com>',
      apiKey: 'test-key',
    };
    const rejected = await sendTaxiLogReportEmail(report, settings, async () => new Response('no', { status: 500 }));
    assert.deepEqual(rejected, { ok: false, error: 'Resend avvisade mejlet.' });

    let seenTo: string[] = [];
    const accepted = await sendTaxiLogReportEmail(report, settings, async (_input, init) => {
      seenTo = JSON.parse(String(init?.body)).to;
      return new Response('{}', { status: 200 });
    });
    assert.deepEqual(accepted, { ok: true });
    assert.deepEqual(seenTo, ['report-test@example.com']);
  });
});
