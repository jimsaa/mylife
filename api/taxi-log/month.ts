import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getMonth } from '../_lib/taxi-log-store';
import { methodNotAllowed, requireAdmin } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) {
      res.status(400).json({ error: 'year and month are required' });
      return;
    }
    res.status(200).json(await getMonth(year, month));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    res.status(400).json({ error: message });
  }
}
