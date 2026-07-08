import { NextResponse } from 'next/server';
import { getServerSession, encodeSession, sessionCookieName } from '@/lib/auth/session';
import { hasCompletedSetupWizard } from '@/lib/setup-wizard/access';
import {
  completeUserOnboarding,
  getPublicAiTools,
  getUserById,
} from '@/lib/repositories/content-repository';

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(session.id) ?? session;
  const recommendedBuilder =
    getPublicAiTools().find(
      (t) => t.category === 'ai_builder' && t.recommendation_status === 'recommended'
    ) ?? getPublicAiTools().find((t) => t.category === 'ai_builder') ?? null;

  return NextResponse.json({
    completed: hasCompletedSetupWizard(user),
    user,
    recommended_builder: recommendedBuilder,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const preferred_ai_chat =
    body.preferred_ai_chat === 'later' ? null : (body.preferred_ai_chat ?? null);

  const updated = completeUserOnboarding(session.id, { preferred_ai_chat });
  if (!updated) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const res = NextResponse.json({ user: updated, completed: true });
  res.cookies.set(sessionCookieName, encodeSession(updated), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
