import { Router } from 'express';
import {
  ADMIN_SESSION_COOKIE,
  buildSessionCookieHeader,
  checkTempPassword,
  clearSessionCookieHeader,
  createSessionCookieValue,
  parseCookieHeader,
  verifySessionCookieValue,
} from '../../../api/_lib/temp-gate.ts';

const router = Router();

router.post('/login', (req, res) => {
  const password = req.body?.password;
  if (typeof password !== 'string' || !checkTempPassword(password)) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  res.setHeader('Set-Cookie', buildSessionCookieHeader(createSessionCookieValue()));
  res.json({ ok: true });
});

router.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', clearSessionCookieHeader());
  res.json({ ok: true });
});

router.get('/session', (req, res) => {
  const value = parseCookieHeader(req.headers.cookie, ADMIN_SESSION_COOKIE);
  res.json({ authenticated: verifySessionCookieValue(value) });
});

export default router;
