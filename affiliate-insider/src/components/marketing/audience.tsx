import { Section, SectionTitle } from './section';
import { LANDING_AUDIENCE } from '@/lib/constants';

export function AudienceSection() {
  return (
    <Section className="border-y border-white/5 bg-white/[0.02]">
      <SectionTitle title="Who this is for" subtitle="You don't need to be technical. You need to be willing to build." />

      <div className="flex flex-wrap justify-center gap-3">
        {LANDING_AUDIENCE.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-zinc-900/80 px-5 py-2.5 text-sm font-medium text-zinc-200"
          >
            {item}
          </span>
        ))}
      </div>
    </Section>
  );
}
