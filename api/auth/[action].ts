import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ADMIN_SESSION_COOKIE,
  buildSessionCookieHeader,
  checkTempPassword,
  clearSessionCookieHeader,
  createSessionCookieValue,
  parseCookieHeader,
  verifySessionCookieValue,
} from '../_lib/temp-gate';

function actionOf(req: VercelRequest): string {
  const raw = req.query.action;
  return Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const action = actionOf(req);

  if (action === 'login') {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const password = req.body?.password;
    if (typeof password !== 'string' || !checkTempPassword(password)) {
      res.status(401).json({ error: 'Incorrect password.' });
      return;
    }
    res.setHeader('Set-Cookie', buildSessionCookieHeader(createSessionCookieValue()));
    res.status(200).json({ ok: true });
    return;
  }

  if (action === 'logout') {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    res.setHeader('Set-Cookie', clearSessionCookieHeader());
    res.status(200).json({ ok: true });
    return;
  }

  if (action === 'session') {
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const value = parseCookieHeader(req.headers.cookie, ADMIN_SESSION_COOKIE);
    res.status(200).json({ authenticated: verifySessionCookieValue(value) });
    return;
  }

  res.status(404).json({ error: 'Not found' });
}
