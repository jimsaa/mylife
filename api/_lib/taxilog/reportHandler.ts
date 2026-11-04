import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readTaxiLogState } from '../taxi-log-store';
import { buildTaxiLogReport } from './calculations/taxiLogReport';
import { readTaxiLogEmailSettings, sendTaxiLogReportEmail } from './taxiLogReportEmail';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../vercel-http';

function headerValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Browser POST Origin must match the host that received the request. */
export function isSameOriginReportRequest(req: VercelRequest): boolean {
  const origin = headerValue(req.headers.origin).trim();
  const forwarded = headerValue(req.headers['x-forwarded-host']).split(',')[0]?.trim() ?? '';
  const host = forwarded || headerValue(req.headers.host).split(',')[0]?.trim() || '';
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function handleTaxiLogReport(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }
  if (!isSameOriginReportRequest(req)) {
    res.status(403).json({ error: 'Ogiltig begäran.' });
    return;
  }

  try {
    const body = readJsonBody<{ date?: string }>(req);
    const date = String(body.date ?? '').trim();
    if (!date) {
      res.status(400).json({ error: 'Rapportdatum krävs.' });
      return;
    }
    const report = buildTaxiLogReport(await readTaxiLogState(), date);
    const email = readTaxiLogEmailSettings();
    if (!email.ok) {
      res.status(400).json({ error: email.error });
      return;
    }
    const sent = await sendTaxiLogReportEmail(report, email.settings);
    if (!sent.ok) {
      res.status(502).json({ error: sent.error });
      return;
    }
    res.status(200).json({ sent: true, recipient: email.settings.to });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    res.status(400).json({ error: message });
  }
}
