import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readTaxiLogState } from '../_lib/taxi-log-store';
import { buildTaxiLogReport } from '../_lib/taxilog/calculations/taxiLogReport';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    res.status(200).json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    res.status(400).json({ error: message });
  }
}
