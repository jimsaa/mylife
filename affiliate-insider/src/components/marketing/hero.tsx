import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAND, BUILDER_PASS } from '@/lib/constants';
import { formatBuilderPassPriceLabel, getBuilderPassPricing } from '@/lib/pricing';

export function HeroSection() {
  const pricing = getBuilderPassPricing();

  return (
    <section className="relative overflow-hidden px-4 pb-24 pt-32 sm:pt-40">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[520px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-fuchsia-600/10 blur-[80px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        <p className="mb-4 text-sm font-medium text-violet-300">{BRAND.tagline}</p>
        <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-6xl">
          Learn How To Build Digital Income Projects With AI
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl">
          Discover the AI workflow that lets ordinary people build websites, digital products,
          KDP businesses, affiliate assets and more — without becoming programmers.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/checkout">
            <Button size="lg" className="min-w-[240px] gap-2">
              Get {BUILDER_PASS.name} — ${pricing.priceUsd}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#what-you-learn">
            <Button variant="secondary" size="lg" className="min-w-[200px]">
              See What&apos;s Included
            </Button>
          </a>
        </div>

        <p className="mt-6 text-sm text-zinc-500">
          {BUILDER_PASS.name} · {formatBuilderPassPriceLabel(pricing)}
        </p>
      </div>
    </section>
  );
}
