import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CardDark } from '@/components/ui/card';
import { BUILDER_PASS, MONTHLY_BUILD_PRO } from '@/lib/constants';
import { formatBuilderPassPriceLabel, getBuilderPassPricing } from '@/lib/pricing';

export function PricingSection() {
  const pricing = getBuilderPassPricing();

  return (
    <section className="px-4 py-20">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold text-white">Simple pricing</h2>
        <p className="mt-3 text-zinc-400">Two products. No Lite plans. No enterprise tiers.</p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <CardDark className="border-violet-500/30 text-left">
            <p className="text-sm uppercase tracking-wider text-violet-400">Entry product</p>
            <h3 className="mt-2 text-2xl font-bold text-white">{BUILDER_PASS.name}</h3>
            <p className="mt-4 text-5xl font-bold text-white">${pricing.priceUsd}</p>
            <p className="mt-2 text-zinc-400">{formatBuilderPassPriceLabel(pricing)}</p>
            <ul className="mt-8 space-y-2 text-sm text-zinc-300">
              {BUILDER_PASS.includes.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
            <Link href="/checkout" className="mt-8 block">
              <Button size="lg" className="w-full">
                Get {BUILDER_PASS.name}
              </Button>
            </Link>
          </CardDark>

          <CardDark className="border-fuchsia-500/20 text-left">
            <p className="text-sm uppercase tracking-wider text-fuchsia-400">Primary membership</p>
            <h3 className="mt-2 text-2xl font-bold text-white">{MONTHLY_BUILD_PRO.name}</h3>
            <p className="mt-4 text-5xl font-bold text-white">${MONTHLY_BUILD_PRO.priceUsd}</p>
            <p className="mt-2 text-zinc-400">Per month · Cancel anytime</p>
            <ul className="mt-8 space-y-2 text-sm text-zinc-300">
              {MONTHLY_BUILD_PRO.includes.slice(0, 5).map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
              <li className="text-zinc-500">+ Full Build Archive & live Q&A</li>
            </ul>
            <Button size="lg" variant="secondary" className="mt-8 w-full" disabled>
              Available after Builder Pass
            </Button>
          </CardDark>
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  const pricing = getBuilderPassPricing();

  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-3xl rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-zinc-950 p-12 text-center">
        <h2 className="text-3xl font-bold text-white">Ready to launch faster?</h2>
        <p className="mt-4 text-zinc-400">
          Start with {BUILDER_PASS.name} — qualify yourself for {MONTHLY_BUILD_PRO.name}.
        </p>
        <Link href="/checkout" className="mt-8 inline-block">
          <Button size="lg">
            Get {BUILDER_PASS.name} — ${pricing.priceUsd}
          </Button>
        </Link>
      </div>
    </section>
  );
}
