import { NextResponse } from 'next/server';
import { hasAdminAccess } from '@/lib/auth/permissions';
import { getServerSession } from '@/lib/auth/session';
import { getAdminPayoutRows } from '@/lib/repositories/affiliate-repository';

/** Export eligible payouts for manual PayPal — no API integration */
export async function GET() {
  const user = await getServerSession();
  if (!user || !hasAdminAccess(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = getAdminPayoutRows().filter((r) => r.approved_balance_cents > 0);

  const csvRows = [
  ['email', 'paypal_email', 'full_name', 'approved_balance_usd', 'eligible'],
    ...rows.map((r) => [
      r.email,
      r.paypal_email ?? '',
      r.full_name ?? '',
      (r.approved_balance_cents / 100).toFixed(2),
      r.eligible_for_payout ? 'yes' : 'no',
    ]),
  ];

  const csv = csvRows.map((r) => r.join(',')).join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="affiliate-payouts-export.csv"',
    },
  });
}
