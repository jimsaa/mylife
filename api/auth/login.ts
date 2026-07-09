import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildSessionCookieHeader,
  checkTempPassword,
  createSessionCookieValue,
} from '../_lib/temp-gate';

export default function handler(req: VercelRequest, res: VercelResponse) {
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
}
