import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import {
  canUserAccessAffiliateCenter,
  getPurchases,
} from '@/lib/repositories/affiliate-repository';

export async function GET() {
  const user = await getServerSession();
  const purchases = getPurchases();
  return NextResponse.json({
    user,
    affiliate_center_access: user ? canUserAccessAffiliateCenter(user) : false,
    purchases_count: purchases.filter((p) => p.status === 'completed').length,
  });
}
