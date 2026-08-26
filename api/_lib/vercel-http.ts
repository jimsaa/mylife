import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  ADMIN_SESSION_COOKIE,
  parseCookieHeader,
  verifySessionCookieValue,
} from './temp-gate';

export function requireAdmin(req: VercelRequest, res: VercelResponse): boolean {
  const value = parseCookieHeader(req.headers.cookie, ADMIN_SESSION_COOKIE);
  if (!verifySessionCookieValue(value)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

export function methodNotAllowed(res: VercelResponse, allow: string[]): void {
  res.setHeader('Allow', allow.join(', '));
  res.status(405).json({ error: 'Method not allowed' });
}

export function readJsonBody<T>(req: VercelRequest): T {
  if (req.body == null) return {} as T;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as T;
    } catch {
      return {} as T;
    }
  }
  return req.body as T;
}
