import type {
  CheckoutSessionResult,
  CreateCheckoutInput,
  PaymentProvider,
  WebhookResult,
} from './types';

/**
 * Stripe placeholder — swap in @stripe/stripe-js + stripe SDK when keys are configured.
 * Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in production.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = 'stripe';

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      // Dev / MVP: return mock session for local funnel testing
      const sessionId = `mock_stripe_${Date.now()}`;
      return {
        sessionId,
        checkoutUrl: null,
        status: 'pending',
      };
    }

    // Future: const stripe = new Stripe(secretKey);
    // return stripe.checkout.sessions.create({ ... });
    throw new Error('Stripe SDK integration pending — configure STRIPE_SECRET_KEY');
  }

  async verifyWebhook(_payload: unknown, _signature: string | null): Promise<WebhookResult> {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return { event: 'unknown', sessionId: null, customerEmail: null, metadata: {} };
    }
    throw new Error('Stripe webhook verification pending');
  }
}
