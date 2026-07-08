import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import {
  canUserAccessAffiliateCenter,
  getOrEnrollAffiliate,
  getPayoutSettings,
  savePayoutSettings,
} from '@/lib/repositories/affiliate-repository';

export async function GET() {
  const user = await getServerSession();
  if (!user || !canUserAccessAffiliateCenter(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const affiliate = getOrEnrollAffiliate(user);
  return NextResponse.json({ settings: getPayoutSettings(affiliate.id) });
}

export async function PUT(request: Request) {
  const user = await getServerSession();
  if (!user || !canUserAccessAffiliateCenter(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const affiliate = getOrEnrollAffiliate(user);
  const body = await request.json();
  const settings = savePayoutSettings(affiliate.id, {
    paypal_email: String(body.paypal_email ?? '').trim(),
    full_name: String(body.full_name ?? '').trim(),
    country: String(body.country ?? '').trim(),
    preferred_currency: String(body.preferred_currency ?? 'USD').trim(),
  });
  return NextResponse.json({ settings });
}
