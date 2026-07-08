import { cookies } from 'next/headers';
import type { UserProfile } from '@/types';

const SESSION_COOKIE = 'ai_session';

export async function getServerSession(): Promise<UserProfile | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf-8')) as UserProfile;
  } catch {
    return null;
  }
}

export function encodeSession(user: UserProfile): string {
  return Buffer.from(JSON.stringify(user)).toString('base64url');
}

export const sessionCookieName = SESSION_COOKIE;
