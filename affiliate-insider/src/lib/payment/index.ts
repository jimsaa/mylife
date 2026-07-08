import { StripePaymentProvider } from './stripe-provider';
import type { CreateCheckoutInput, PaymentProvider } from './types';
import { getProductCheckout } from '@/lib/constants';

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) {
    const name = process.env.PAYMENT_PROVIDER ?? 'stripe';
    if (name === 'stripe') provider = new StripePaymentProvider();
    else throw new Error(`Unknown payment provider: ${name}`);
  }
  return provider;
}

export async function createVaultCheckout(successUrl: string, cancelUrl: string) {
  const product = getProductCheckout();
  const payment = getPaymentProvider();
  return payment.createCheckoutSession({
    productId: product.slug,
    amountCents: product.priceCents,
    currency: product.currency,
    successUrl,
    cancelUrl,
    metadata: { product: 'builder_pass' },
  });
}

export type { CreateCheckoutInput, PaymentProvider };
