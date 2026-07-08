import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BUILDER_PASS } from '@/lib/constants';
import { getBuilderPassPricing } from '@/lib/pricing';

export function FinalCtaSection() {
  const pricing = getBuilderPassPricing();

  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-3xl rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-950/30 to-zinc-950 px-8 py-16 text-center sm:px-12">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ready to stop watching AI videos and actually start building?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
          Get {BUILDER_PASS.name} today for ${pricing.priceUsd}. Clarity, confidence, and a
          system you can follow — not more theory.
        </p>
        <Link href="/checkout" className="mt-10 inline-block">
          <Button size="lg" className="gap-2 px-10">
            Get {BUILDER_PASS.name} — ${pricing.priceUsd}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <p className="mt-4 text-sm text-zinc-500">One-time payment · Lifetime access</p>
      </div>
    </section>
  );
}
