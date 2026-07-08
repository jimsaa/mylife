import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getUserProgress, updateUserProgress } from '@/lib/repositories/content-repository';

export async function GET() {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ progress: getUserProgress(user.id) });
}

export async function PUT(request: Request) {
  const user = await getServerSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const progress = updateUserProgress(user.id, body.tasks ?? body);
  return NextResponse.json({ progress });
}
