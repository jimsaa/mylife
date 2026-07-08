import type { Request, Response, NextFunction } from 'express';
import {
  ADMIN_SESSION_COOKIE,
  parseCookieHeader,
  verifySessionCookieValue,
} from '../../../shared/auth/temp-gate.ts';

/** Protects API routes until Supabase Auth replaces this gate. */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const value = parseCookieHeader(req.headers.cookie, ADMIN_SESSION_COOKIE);
  if (!verifySessionCookieValue(value)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}
