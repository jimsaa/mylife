import { Section, SectionTitle } from './section';
import { LANDING_COMPARISON } from '@/lib/constants';

export function ComparisonSection() {
  return (
    <Section className="border-y border-white/5 bg-white/[0.02]">
      <SectionTitle
        eyebrow="Why this is different"
        title="Not another course. Not another PDF dump."
        subtitle="Most AI products sell information. Builder Pass teaches you how to build."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8">
          <p className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            {LANDING_COMPARISON.negative.title}
          </p>
          <ul className="mt-6 space-y-4">
            {LANDING_COMPARISON.negative.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-zinc-400">
                <span className="mt-0.5 text-red-400/80">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-zinc-900/50 p-8">
          <p className="text-sm font-medium uppercase tracking-wider text-violet-400">
            {LANDING_COMPARISON.positive.title}
          </p>
          <ul className="mt-6 space-y-4">
            {LANDING_COMPARISON.positive.items.map((item) => (
              <li key={item} className="flex items-start gap-3 text-zinc-200">
                <span className="mt-0.5 text-emerald-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
