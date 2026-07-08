import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ADMIN_SESSION_COOKIE,
  parseCookieHeader,
  verifySessionCookieValue,
} from '../../shared/auth/temp-gate.ts';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const value = parseCookieHeader(req.headers.cookie, ADMIN_SESSION_COOKIE);
  res.status(200).json({ authenticated: verifySessionCookieValue(value) });
}
