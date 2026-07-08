import { Brain, Hammer, Layers, Rocket, Wrench } from 'lucide-react';
import { Section, SectionTitle } from './section';
import { LEARN_MODULES } from '@/lib/constants';

const ICONS = [Brain, Layers, Hammer, Wrench, Rocket];

export function LearnSection() {
  return (
    <Section id="what-you-learn">
      <SectionTitle
        eyebrow="Curriculum"
        title="What you'll learn"
        subtitle="A practical system — from mindset to your first built project."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LEARN_MODULES.map((module, i) => {
          const Icon = ICONS[i] ?? Rocket;
          return (
            <div
              key={module.title}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet-500/30 hover:bg-white/[0.05]"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400 transition group-hover:bg-violet-500/25">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-white">{module.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{module.description}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
