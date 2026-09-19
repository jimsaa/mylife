import type { VercelRequest, VercelResponse } from '@vercel/node';
import { loadHpbBets } from '../_lib/hpb-bets/service';
import { methodNotAllowed, requireAdmin } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  try {
    res.status(200).json(await loadHpbBets());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load HPB bets.';
    res.status(500).json({ error: message });
  }
}
