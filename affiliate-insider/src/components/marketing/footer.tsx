import { BRAND } from '@/lib/constants';

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 px-4 py-12 text-center">
      <p className="font-medium text-zinc-300">{BRAND.name}</p>
      <p className="mt-1 text-sm text-zinc-500">{BRAND.tagline}</p>
      <p className="mt-4 text-xs text-zinc-600">affiliateinsider.jimsaari.se</p>
    </footer>
  );
}
