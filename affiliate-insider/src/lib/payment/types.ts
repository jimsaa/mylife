export interface PaymentProvider {
  readonly name: string;
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionResult>;
  verifyWebhook(payload: unknown, signature: string | null): Promise<WebhookResult>;
}

export interface CreateCheckoutInput {
  productId: string;
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string | null;
  status: 'pending' | 'completed';
}

export interface WebhookResult {
  event: 'checkout.completed' | 'checkout.failed' | 'unknown';
  sessionId: string | null;
  customerEmail: string | null;
  metadata: Record<string, string>;
}
