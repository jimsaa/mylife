'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CardDark } from '@/components/ui/card';
import { InputDark } from '@/components/ui/input';
import { BUILDER_PASS } from '@/lib/constants';
import { formatBuilderPassPriceLabel, getBuilderPassPricing } from '@/lib/pricing';

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const pricing = getBuilderPassPricing();

  const checkout = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // MVP: mock payment — proceed to account creation
      sessionStorage.setItem('checkout_email', email);
      sessionStorage.setItem('checkout_session_id', data.sessionId);
      router.push('/signup?purchased=1');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <CardDark className="w-full max-w-md">
        <Link href="/" className="text-sm text-zinc-400 hover:text-white">
          ← Back
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">{BUILDER_PASS.name}</h1>
        <p className="mt-2 text-zinc-400">{formatBuilderPassPriceLabel(pricing)}</p>

        <label className="mt-8 block">
          <span className="text-sm text-zinc-400">Email for receipt</span>
          <InputDark
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2"
            required
          />
        </label>

        <Button
          className="mt-6 w-full"
          size="lg"
          disabled={loading || !email}
          onClick={checkout}
        >
          {loading ? 'Processing...' : `Pay $${pricing.priceUsd} — Get ${BUILDER_PASS.name}`}
        </Button>

        <p className="mt-4 text-center text-xs text-zinc-500">
          Secure checkout via Stripe (placeholder in dev). Payment provider is swappable.
        </p>
      </CardDark>
    </div>
  );
}
