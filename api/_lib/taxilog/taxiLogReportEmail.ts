import type { TaxiLogReport, TaxiLogReportPeriod } from './calculations/taxiLogReport';

export type TaxiLogEmailSettings = {
  to: string;
  from: string;
  apiKey: string;
};

export type TaxiLogReportMessage = {
  subject: string;
  text: string;
  html: string;
};

const RESEND_URL = 'https://api.resend.com/emails';

export function readTaxiLogEmailSettings(
  env: NodeJS.ProcessEnv = process.env,
): { ok: true; settings: TaxiLogEmailSettings } | { ok: false; error: string } {
  const provider = (env.EMAIL_PROVIDER ?? '').trim().toLowerCase();
  if (provider !== 'resend') {
    return { ok: false, error: 'E-post är inte konfigurerad. Sätt EMAIL_PROVIDER=resend.' };
  }
  const apiKey = (env.RESEND_API_KEY ?? '').trim();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY saknas.' };
  const from = (env.EMAIL_FROM ?? '').trim();
  if (!from) return { ok: false, error: 'EMAIL_FROM saknas.' };
  const to = (env.TAXILOG_REPORT_TO ?? '').trim();
  if (!to) return { ok: false, error: 'TAXILOG_REPORT_TO saknas.' };
  return { ok: true, settings: { to, from, apiKey } };
}

function formatMoney(value: string | null): string {
  if (value == null || value.trim() === '') return 'Ej registrerat';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Ej registrerat';
  if (amount === 0) return '0 kr';
  const [whole, fraction] = amount.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction === '00' ? `${grouped} kr` : `${grouped},${fraction} kr`;
}

function formatHours(value: string | null): string {
  if (value == null || value.trim() === '') return 'Ej registrerat';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Ej registrerat';
  if (amount === 0) return '0 h';
  return `${value} h`;
}

function periodLines(title: string, period: TaxiLogReportPeriod): string[] {
  return [
    title,
    `Period: ${period.periodStart} – ${period.periodEnd}`,
    `Egna bokningar: ${formatMoney(period.ownBookings)}`,
    `Hand Up: ${formatMoney(period.handUp)}`,
    `Uber: ${formatMoney(period.uberIncome)}`,
    `Bolt: ${formatMoney(period.boltIncome)}`,
    `Bonus: ${formatMoney(period.bonus)}`,
    `Dricks: ${formatMoney(period.tips)}`,
    `Arbetade timmar: ${formatHours(period.workedHours)}`,
    `Intäkt per arbetad timme: ${formatMoney(period.incomePerHour)}`,
  ];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatTaxiLogReportEmail(report: TaxiLogReport): TaxiLogReportMessage {
  const text = [
    `TaxiLog-rapport ${report.reportDate}`,
    '',
    ...periodLines(`Dagssammanställning ${report.reportDate}`, report.day),
    '',
    ...periodLines('Veckosammanställning måndag–söndag', report.week),
    '',
    ...periodLines('Månadssammanställning', report.month),
  ].join('\n');

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #0f172a;">
<pre style="font-family: ui-monospace, monospace; white-space: pre-wrap;">${escapeHtml(text)}</pre>
</body>
</html>`;

  return {
    subject: `TaxiLog – rapport ${report.reportDate}`,
    text,
    html,
  };
}

export async function sendTaxiLogReportEmail(
  report: TaxiLogReport,
  settings: TaxiLogEmailSettings,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const message = formatTaxiLogReportEmail(report);
  try {
    const response = await fetchImpl(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: settings.from,
        to: [settings.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      return { ok: false, error: 'Resend avvisade mejlet.' };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Mejlet kunde inte skickas.',
    };
  }
}
