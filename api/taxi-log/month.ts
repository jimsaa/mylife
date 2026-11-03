import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMonth, settleMonth, unlockMonth } from '../_lib/taxi-log-store';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      const year = Number(req.query.year);
      const month = Number(req.query.month);
      if (!year || !month) {
        res.status(400).json({ error: 'year and month are required' });
        return;
      }
      res.status(200).json(await getMonth(year, month));
      return;
    }

    if (req.method === 'POST') {
      const body = readJsonBody<{ year?: number; month?: number; action?: string }>(req);
      const year = Number(body.year);
      const month = Number(body.month);
      const action = String(req.query.action ?? body.action ?? 'settle');
      if (!year || !month) {
        res.status(400).json({ error: 'year and month are required' });
        return;
      }
      if (action === 'unlock') {
        res.status(200).json(await unlockMonth(year, month));
        return;
      }
      res.status(201).json(await settleMonth(year, month));
      return;
    }

    methodNotAllowed(res, ['GET', 'POST']);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    res.status(400).json({ error: message });
  }
}
