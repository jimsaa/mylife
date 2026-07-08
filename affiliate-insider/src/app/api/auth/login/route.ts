import { NextResponse } from 'next/server';
import { resolveRoleForEmail } from '@/lib/auth/permissions';
import { encodeSession, sessionCookieName } from '@/lib/auth/session';
import { emitEmailEvent } from '@/lib/email/emitter';
import { getUserByEmail, registerUser } from '@/lib/repositories/content-repository';

export async function POST(request: Request) {
  const body = await request.json();
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');
  const fullName = String(body.full_name ?? body.fullName ?? '').trim();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const role = resolveRoleForEmail(email);
  registerUser({
    email,
    full_name: fullName || email.split('@')[0],
    role,
    avatar_url: null,
    onboarding_completed_at: null,
    preferred_ai_chat: null,
  });
  const user = getUserByEmail(email);
  if (!user) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }

  await emitEmailEvent('user.registered', {
    email: user.email,
    full_name: user.full_name,
  });

  const res = NextResponse.json({ user });
  res.cookies.set(sessionCookieName, encodeSession(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
