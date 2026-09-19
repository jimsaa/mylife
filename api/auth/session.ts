import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleHpbBetsRequest } from '../_lib/hpb-bets/http';
import {
  ADMIN_SESSION_COOKIE,
  parseCookieHeader,
  verifySessionCookieValue,
} from '../_lib/temp-gate';

function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Hobby plan is limited to 12 serverless functions; HPB Results is rewritten here.
  if (queryValue(req.query.resource) === 'hpb-bets') {
    await handleHpbBetsRequest(req, res);
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const value = parseCookieHeader(req.headers.cookie, ADMIN_SESSION_COOKIE);
  res.status(200).json({ authenticated: verifySessionCookieValue(value) });
}
