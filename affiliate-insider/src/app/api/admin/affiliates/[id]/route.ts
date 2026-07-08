import { NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/auth/permissions';
import { getServerSession } from '@/lib/auth/session';
import {
  approveCommission,
  getAffiliateProfileById,
  setCommissionOverride,
  updateAffiliateStatus,
} from '@/lib/repositories/affiliate-repository';
import type { AffiliateStatus } from '@/types/affiliate';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const profile = getAffiliateProfileById(id);
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ profile });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  if (body.action === 'approve') {
    const profile = updateAffiliateStatus(id, 'active');
    return NextResponse.json({ profile });
  }

  if (body.action === 'disable') {
    const profile = updateAffiliateStatus(id, 'disabled', body.reason);
    return NextResponse.json({ profile });
  }

  if (body.action === 'set_commission_override') {
    const profile = setCommissionOverride(id, body.percent ?? null);
    return NextResponse.json({ profile });
  }

  if (body.action === 'approve_commission' && body.commission_id) {
    const commission = approveCommission(body.commission_id);
    return NextResponse.json({ commission });
  }

  if (body.status) {
    const profile = updateAffiliateStatus(id, body.status as AffiliateStatus, body.reason);
    return NextResponse.json({ profile });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
