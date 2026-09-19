import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleHpbBetsRequest } from '../_lib/hpb-bets/http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleHpbBetsRequest(req, res);
}
