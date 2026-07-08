import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { hasAdminAccess } from '@/lib/auth/permissions';
import {
  getAdminStats,
  getAnalyticsPlaceholders,
} from '@/lib/repositories/content-repository';

export async function GET() {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    stats: getAdminStats(),
    analytics: getAnalyticsPlaceholders(),
  });
}
