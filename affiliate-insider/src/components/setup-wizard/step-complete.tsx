'use client';

import { ArrowDown } from 'lucide-react';
import { LESSON_1_HREF } from '@/lib/setup-wizard/access';
import { SETUP_WIZARD_COPY } from '@/lib/setup-wizard/constants';
import { WizardCard, WizardPrimaryButton, WizardTitle } from './wizard-shell';

export function StepComplete({ onFinish }: { onFinish: () => void }) {
  const copy = SETUP_WIZARD_COPY.steps.complete;

  return (
    <WizardCard>
      <WizardTitle title={copy.title} />

      <div className="mx-auto mt-10 flex max-w-xs flex-col items-center">
        {copy.flow.map((item, i) => (
          <div key={item.label} className="flex w-full flex-col items-center">
            <div
              className={
                i === 0
                  ? 'w-full rounded-xl border border-violet-500/40 bg-violet-950/50 px-4 py-3 text-center font-semibold text-white'
                  : 'w-full rounded-lg border border-white/10 bg-zinc-950/80 px-4 py-2.5 text-center text-sm text-zinc-300'
              }
            >
              {item.label}
              {'role' in item && item.role && (
                <p
                  className={
                    i === 0
                      ? 'mt-1 text-[11px] font-normal tracking-wide text-violet-300/70'
                      : 'mt-1 text-[11px] font-normal tracking-wide text-zinc-500'
                  }
                >
                  {item.role}
                </p>
              )}
            </div>
            {i < copy.flow.length - 1 && (
              <ArrowDown className="my-1.5 h-4 w-4 text-zinc-600" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <p className="text-lg font-semibold text-white">{copy.congratulations}</p>
        <p className="mt-2 text-zinc-400">{copy.message}</p>
        <p className="mt-1 text-sm text-zinc-500">{copy.submessage}</p>
      </div>

      <div className="mt-8 rounded-xl border border-violet-500/20 bg-violet-950/30 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
          {copy.builderRule.label}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{copy.builderRule.text}</p>
      </div>

      <div className="mt-8">
        <WizardPrimaryButton onClick={onFinish}>{copy.primaryLabel}</WizardPrimaryButton>
      </div>
    </WizardCard>
  );
}

export { LESSON_1_HREF };
