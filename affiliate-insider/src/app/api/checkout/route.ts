import { NextResponse } from 'next/server';
import { createVaultCheckout } from '@/lib/payment';
import { recordPurchase } from '@/lib/repositories/content-repository';
import { emitEmailEvent } from '@/lib/email/emitter';
import { getProductCheckout } from '@/lib/constants';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email : undefined;
  const product = getProductCheckout();

  const origin = request.headers.get('origin') ?? 'http://localhost:3000';
  const session = await createVaultCheckout(
    `${origin}/signup?purchased=1`,
    `${origin}/checkout`
  );

  if (email) {
    const purchase = recordPurchase({
      user_id: null,
      email,
      product: product.slug,
      amount_cents: product.priceCents,
      currency: product.currency,
      status: 'completed',
    });
    await emitEmailEvent('purchase.completed', {
      email,
      product: product.slug,
      amount_cents: product.priceCents,
    });
  }

  return NextResponse.json({
    sessionId: session.sessionId,
    checkoutUrl: session.checkoutUrl,
    status: session.status,
    email,
  });
}
