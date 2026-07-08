import { OnboardingChecklist } from '@/components/vault/onboarding-checklist';
import { VaultCard, VaultPageHeader } from '@/components/vault/vault-ui';
import { CheckCircle2 } from 'lucide-react';

const GUIDE = [
  {
    title: 'Your niche comes first',
    body: 'Pick one audience and one offer. The Vault helps you create faster — focus is still yours.',
  },
  {
    title: 'Use prompts as templates',
    body: 'Replace bracketed placeholders with your product, audience, and angle. Never copy blindly.',
  },
  {
    title: 'Test hooks weekly',
    body: 'Copy 3 hooks from the Vault each week. Track which ones get the most engagement.',
  },
  {
    title: 'Build a simple stack',
    body: 'One writing tool, one video tool, one design tool. Save favorites in the directory.',
  },
];

export default function StartHerePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <VaultPageHeader
        title="Start Here"
        subtitle="Quick Start — about 30 minutes to your first content."
      />

      <OnboardingChecklist />

      <VaultCard compact className="border-emerald-500/20 bg-emerald-950/20">
        <p className="font-medium text-emerald-200">
          Lifetime access means no rush. Complete the checklist at your own pace.
        </p>
      </VaultCard>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Quick Start Guide</h2>
        {GUIDE.map((section) => (
          <VaultCard key={section.title} compact className="flex gap-4">
            <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-violet-400" />
            <div>
              <h3 className="font-semibold text-white">{section.title}</h3>
              <p className="mt-1 text-zinc-400">{section.body}</p>
            </div>
          </VaultCard>
        ))}
      </div>
    </div>
  );
}
