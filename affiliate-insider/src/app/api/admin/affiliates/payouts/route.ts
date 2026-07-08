import { NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/auth/permissions';
import { getServerSession } from '@/lib/auth/session';
import {
  createManualPayout,
  getAdminPayoutRows,
  getAllPayouts,
  getProgramConfig,
  updateProgramConfig,
} from '@/lib/repositories/affiliate-repository';
import { payoutMethodLabel } from '@/lib/affiliate/format';

export async function GET() {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const config = getProgramConfig();
  return NextResponse.json({
    config: {
      ...config,
      payout_method_label: payoutMethodLabel(config.payout_method),
    },
    affiliates: getAdminPayoutRows(),
    payouts: getAllPayouts(),
  });
}

export async function PUT(request: Request) {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  if (body.action === 'update_config') {
    const config = updateProgramConfig({
      minimum_payout_cents: Number(body.minimum_payout_cents),
      payout_schedule: body.payout_schedule,
    });
    return NextResponse.json({ config });
  }

  if (body.action === 'mark_paid' && body.affiliate_id) {
    const payout = createManualPayout(body.affiliate_id, {
      reference: body.reference,
      notes: body.notes,
    });
    if (!payout) {
      return NextResponse.json(
        { error: 'Not eligible — check minimum balance and PayPal settings' },
        { status: 400 }
      );
    }
    return NextResponse.json({ payout });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
