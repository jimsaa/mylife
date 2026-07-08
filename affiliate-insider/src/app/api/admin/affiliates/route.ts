import { NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/auth/permissions';
import { getServerSession } from '@/lib/auth/session';
import {
  computeAdminStats,
  getAllAffiliateProfiles,
  getAllCommissions,
} from '@/lib/repositories/affiliate-repository';
import { readDatabase } from '@/lib/data/store';

export async function GET() {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = readDatabase();
  const profiles = getAllAffiliateProfiles().map((p) => {
    const member = db.users.find((u) => u.id === p.user_id);
    return {
      ...p,
      email: member?.email ?? 'unknown',
      full_name: member?.full_name ?? null,
    };
  });

  return NextResponse.json({
    stats: computeAdminStats(),
    affiliates: profiles,
    commissions: getAllCommissions(),
    payouts: db.affiliate_payouts,
  });
}
