/**
 * Digital Legacy — cryptographically secure one-time tokens.
 * Raw token is emailed; only SHA-256 hash is stored. Never email passwords.
 */
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const TOKEN_BYTES = 32;

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

/** Generate opaque one-time token. Returns raw (for email) + hash (for DB). */
export function generateOneTimeToken(): { raw: string; hash: string } {
  const raw = randomBytes(TOKEN_BYTES).toString('base64url');
  return { raw, hash: hashToken(raw) };
}

export function signUrlToken(rawToken: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(rawToken).digest('base64url');
  return `${rawToken}.${sig}`;
}

export function verifySignedUrlToken(
  signed: string,
  secret: string,
): string | null {
  const dot = signed.lastIndexOf('.');
  if (dot === -1) return null;
  const raw = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  const expected = createHmac('sha256', secret).update(raw).digest('base64url');
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return raw;
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = scryptSync(password, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export function getTokenSigningSecret(): string {
  return (
    process.env.LEGACY_TOKEN_SECRET ??
    process.env.ADMIN_SESSION_SECRET ??
    'dev-only-legacy-token-secret'
  );
}
