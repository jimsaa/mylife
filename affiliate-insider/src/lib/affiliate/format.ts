export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function payoutMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    paypal: 'PayPal',
    stripe_connect: 'Stripe Connect',
    wise: 'Wise',
    bank_transfer: 'Bank transfer',
  };
  return labels[method] ?? method;
}
