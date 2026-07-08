import { Section, SectionTitle } from './section';
import { LANDING_TESTIMONIALS } from '@/lib/constants';

export function TestimonialsSection() {
  return (
    <Section className="border-y border-white/5 bg-white/[0.02]">
      <SectionTitle title="What learners are saying" />

      <div className="grid gap-6 md:grid-cols-3">
        {LANDING_TESTIMONIALS.map((t) => (
          <blockquote
            key={t.name}
            className="rounded-2xl border border-white/10 bg-zinc-900/40 p-6"
          >
            <p className="text-zinc-300 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <footer className="mt-4 border-t border-white/5 pt-4">
              <p className="font-medium text-white">{t.name}</p>
              <p className="text-sm text-zinc-500">{t.role}</p>
            </footer>
          </blockquote>
        ))}
      </div>
    </Section>
  );
}
