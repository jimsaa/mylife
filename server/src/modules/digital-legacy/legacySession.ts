/**
 * Legacy portal session cookie (separate from admin temp-gate).
 * Issued after claim or legacy login — not an admin session.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const LEGACY_SESSION_COOKIE = 'my_life_legacy_session';
export const LEGACY_SESSION_MAX_AGE_SEC = 86_400 * 7; // 7 days

function secret(): string {
  return (
    process.env.LEGACY_TOKEN_SECRET ??
    process.env.ADMIN_SESSION_SECRET ??
    'dev-only-legacy-token-secret'
  );
}

export function createLegacySessionCookie(accessId: number, contactId: number): string {
  const exp = Date.now() + LEGACY_SESSION_MAX_AGE_SEC * 1000;
  const payload = `${accessId}:${contactId}:${exp}`;
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url');
  const value = `${payload}.${sig}`;
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${LEGACY_SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LEGACY_SESSION_MAX_AGE_SEC}${secure}`;
}

export function clearLegacySessionCookie(): string {
  return `${LEGACY_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function parseLegacySession(
  cookieHeader: string | undefined,
): { accessId: number; contactId: number } | null {
  if (!cookieHeader) return null;
  let value: string | undefined;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === LEGACY_SESSION_COOKIE) {
      value = decodeURIComponent(part.slice(eq + 1).trim());
      break;
    }
  }
  if (!value) return null;

  const dot = value.lastIndexOf('.');
  if (dot === -1) return null;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  const [accessIdStr, contactIdStr, expStr] = payload.split(':');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() >= exp) return null;

  const accessId = Number(accessIdStr);
  const contactId = Number(contactIdStr);
  if (!Number.isFinite(accessId) || !Number.isFinite(contactId)) return null;

  return { accessId, contactId };
}
