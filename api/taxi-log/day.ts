import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDay, saveDay } from '../_lib/taxi-log-store';
import { handleTaxiLogReport } from '../_lib/taxilog/reportHandler';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

function queryAction(req: VercelRequest): string {
  const raw = req.query.action;
  return Array.isArray(raw) ? raw[0] ?? '' : String(raw ?? '');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'POST' && queryAction(req) === 'report') {
      await handleTaxiLogReport(req, res);
      return;
    }
    if (req.method === 'GET') {
      res.status(200).json(await getDay(String(req.query.date ?? '')));
      return;
    }
    if (req.method === 'POST') {
      const body = readJsonBody<{
        date: string;
        grossIncome: string;
        tips?: string;
        workedHours?: string;
        chargingKwh?: string;
        ownBookings?: string | null;
        otherIncome?: string | null;
        handUp?: string | null;
        uberIncome?: string | null;
        boltIncome?: string | null;
        bonus?: string | null;
      }>(req);
      res.status(201).json(
        await saveDay({
          date: String(body.date ?? ''),
          grossIncome: String(body.grossIncome ?? ''),
          tips: String(body.tips ?? '0'),
          workedHours: String(body.workedHours ?? '0'),
          chargingKwh: body.chargingKwh === undefined || body.chargingKwh === null || body.chargingKwh === ''
            ? undefined
            : String(body.chargingKwh),
          ownBookings: body.ownBookings,
          otherIncome: body.otherIncome,
          handUp: body.handUp,
          uberIncome: body.uberIncome,
          boltIncome: body.boltIncome,
          bonus: body.bonus,
        }),
      );
      return;
    }
    methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    res.status(400).json({ error: message });
  }
}
