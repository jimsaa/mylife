import { AFFILIATE_BASE_URL } from './constants';

export const REFERRAL_COOKIE = 'ai_ref';
export const REFERRAL_COOKIE_DAYS = 30;

export function buildReferralUrl(referralCode: string, path = '/'): string {
  const base = AFFILIATE_BASE_URL.replace(/\/$/, '');
  const url = new URL(path, base);
  url.searchParams.set('ref', referralCode);
  return url.toString();
}

/** Client-side: persist referral code from landing URL */
export function captureReferralFromSearch(search: string): string | null {
  const ref = new URLSearchParams(search).get('ref');
  if (!ref?.trim()) return null;
  return ref.trim();
}

export function setReferralCookie(code: string): void {
  if (typeof document === 'undefined') return;
  const maxAge = REFERRAL_COOKIE_DAYS * 24 * 60 * 60;
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getReferralCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
