'use client';

import type { AiTool } from '@/types';
import { buildToolGoUrl } from '@/lib/ai-tools/redirect';
import { SETUP_WIZARD_COPY } from '@/lib/setup-wizard/constants';
import {
  WizardCard,
  WizardPrimaryButton,
  WizardSecondaryButton,
  WizardTitle,
} from './wizard-shell';

export function StepBuilder({
  tool,
  onAlreadyInstalled,
}: {
  tool: AiTool | null;
  onAlreadyInstalled: () => void;
}) {
  const copy = SETUP_WIZARD_COPY.steps.builder;
  const primaryHref = tool?.slug ? buildToolGoUrl(tool.slug) : null;
  const primaryLabel = tool?.button_text
    ? `🚀 ${tool.button_text.replace(/^🚀\s*/, '')}`
    : copy.primaryLabel;

  return (
    <WizardCard>
      <WizardTitle title={copy.title} subtitle={copy.subtitle} />

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-zinc-400">
        {copy.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {tool && (
        <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-950/30 p-4">
          <p className="font-medium text-white">{tool.name}</p>
          {tool.badge && <p className="mt-1 text-xs text-violet-300">{tool.badge}</p>}
          <p className="mt-2 text-xs text-zinc-500">{copy.setupTime}</p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        {primaryHref ? (
          <WizardPrimaryButton href={primaryHref}>{primaryLabel}</WizardPrimaryButton>
        ) : (
          <WizardPrimaryButton onClick={onAlreadyInstalled}>{copy.primaryLabel}</WizardPrimaryButton>
        )}
        <WizardSecondaryButton onClick={onAlreadyInstalled}>
          {copy.secondaryLabel}
        </WizardSecondaryButton>
        {primaryHref && (
          <p className="pt-1 text-center text-xs text-zinc-600">
            After installing, click &ldquo;{copy.secondaryLabel}&rdquo; to continue
          </p>
        )}
      </div>
    </WizardCard>
  );
}
