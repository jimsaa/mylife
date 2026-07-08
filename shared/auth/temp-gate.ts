/**
 * Temporary password gate — replace with Supabase Auth + TOTP later.
 * Shared by Express (local dev) and Vercel serverless (production).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_SESSION_COOKIE = 'my_life_admin_session';
export const SESSION_MAX_AGE_SEC = 86_400;

export function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? 'dev-only-change-in-production';
}

export function getTempPassword(): string {
  return process.env.ADMIN_TEMP_PASSWORD ?? 'life7394';
}

export function createSessionCookieValue(secret = getSessionSecret()): string {
  const exp = Date.now() + SESSION_MAX_AGE_SEC * 1000;
  const sig = createHmac('sha256', secret).update(String(exp)).digest('base64url');
  return `${exp}.${sig}`;
}

export function verifySessionCookieValue(
  value: string | undefined,
  secret = getSessionSecret(),
): boolean {
  if (!value) return false;

  const dot = value.lastIndexOf('.');
  if (dot === -1) return false;

  const exp = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(exp).digest('base64url');

  try {
    if (sig.length !== expected.length) return false;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  } catch {
    return false;
  }

  const expMs = Number(exp);
  return Number.isFinite(expMs) && Date.now() < expMs;
}

export function buildSessionCookieHeader(value: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${ADMIN_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SEC}${secure}`;
}

export function clearSessionCookieHeader(): string {
  return `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function checkTempPassword(input: string): boolean {
  const expected = getTempPassword();
  if (input.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(input), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function parseCookieHeader(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }

  return undefined;
}
