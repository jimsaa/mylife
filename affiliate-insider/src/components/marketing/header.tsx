import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BRAND, BUILDER_PASS } from '@/lib/constants';
import { getBuilderPassPricing } from '@/lib/pricing';

export function MarketingHeader() {
  const pricing = getBuilderPassPricing();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex flex-col">
          <span className="text-lg font-semibold leading-tight text-white">{BRAND.name}</span>
          <span className="hidden text-[10px] font-medium uppercase tracking-wider text-zinc-500 sm:block">
            {BRAND.tagline}
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link href="/login" className="text-sm text-zinc-400 hover:text-white">
            Log in
          </Link>
          <Link href="/checkout">
            <Button size="sm">${pricing.priceUsd} — {BUILDER_PASS.name}</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
