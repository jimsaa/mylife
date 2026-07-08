import { Section, SectionTitle } from './section';
import { PURCHASE_TIMELINE } from '@/lib/constants';

export function TimelineSection() {
  return (
    <Section>
      <SectionTitle
        eyebrow="Simple path"
        title="What happens after purchase"
        subtitle="From payment to your first project — clear steps, no confusion."
      />

      <div className="mx-auto max-w-md">
        <ol className="relative border-l border-white/10 pl-8">
          {PURCHASE_TIMELINE.map((step, i) => (
            <li key={step} className="mb-10 last:mb-0">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border border-violet-500/50 bg-zinc-950 text-xs font-medium text-violet-300">
                {i + 1}
              </span>
              <p className="text-lg font-medium text-white">{step}</p>
              {i < PURCHASE_TIMELINE.length - 1 && (
                <span className="mt-2 block text-zinc-600">↓</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
