import { CardDark } from '@/components/ui/card';
import { LANDING_BENEFITS } from '@/lib/constants';

export function IncludedSection() {
  return (
    <section className="border-y border-white/5 bg-white/[0.02] px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-3xl font-bold text-white">What&apos;s Included</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_BENEFITS.slice(0, 6).map((item) => (
            <CardDark key={item.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl">
                ✦
              </div>
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
            </CardDark>
          ))}
        </div>
      </div>
    </section>
  );
}
