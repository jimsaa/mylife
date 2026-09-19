import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDay, saveDay } from '../_lib/taxi-log-store';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  try {
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
      }>(req);
      res.status(201).json(
        await saveDay({
          date: String(body.date ?? ''),
          grossIncome: String(body.grossIncome ?? ''),
          tips: String(body.tips ?? '0'),
          workedHours: String(body.workedHours ?? '0'),
          chargingKwh: String(body.chargingKwh ?? '0'),
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
