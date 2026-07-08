import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payment';

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const payload = await request.json().catch(() => null);

  const provider = getPaymentProvider();
  const result = await provider.verifyWebhook(payload, signature);

  if (result.event === 'checkout.completed' && result.customerEmail) {
    // Future: mark purchase complete, trigger welcome email, assign VAULT_MEMBER in Supabase
    return NextResponse.json({ received: true, action: 'grant_vault_access' });
  }

  return NextResponse.json({ received: true });
}
