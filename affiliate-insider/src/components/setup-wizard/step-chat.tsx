'use client';

import { cn } from '@/lib/utils';
import { AI_CHAT_OPTIONS, SETUP_WIZARD_COPY } from '@/lib/setup-wizard/constants';
import {
  WizardCard,
  WizardPrimaryButton,
  WizardSecondaryButton,
  WizardTitle,
} from './wizard-shell';

export function StepChat({
  selected,
  onSelect,
  onContinue,
  onLater,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onLater: () => void;
}) {
  const copy = SETUP_WIZARD_COPY.steps.chat;

  return (
    <WizardCard>
      <WizardTitle title={copy.title} subtitle={copy.subtitle} />

      <p className="mt-8 text-center text-sm leading-relaxed text-zinc-500">{copy.body}</p>

      <div className="mt-8 grid gap-3">
        {AI_CHAT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={cn(
              'flex items-center justify-between rounded-xl border px-4 py-3.5 text-left transition',
              selected === option.id
                ? 'border-violet-500/50 bg-violet-950/40 text-white'
                : 'border-white/10 bg-zinc-950/50 text-zinc-300 hover:border-white/20'
            )}
          >
            <span className="font-medium">{option.label}</span>
            {option.recommended && (
              <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                Recommended
              </span>
            )}
          </button>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-zinc-500">{copy.footer}</p>

      <div className="mt-8 space-y-3">
        <WizardPrimaryButton onClick={onContinue}>{copy.primaryLabel}</WizardPrimaryButton>
        <WizardSecondaryButton onClick={onLater}>{copy.secondaryLabel}</WizardSecondaryButton>
      </div>
    </WizardCard>
  );
}
