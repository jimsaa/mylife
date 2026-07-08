import { WhatsNew } from '@/components/vault/whats-new';
import { GlobalSearch } from '@/components/vault/global-search';
import { MonthlyDropCard } from '@/components/vault/monthly-drop-card';
import { OnboardingChecklist } from '@/components/vault/onboarding-checklist';
import { VaultCard, VaultPageHeader } from '@/components/vault/vault-ui';
import { getFeaturedMonthlyDrop, getPublicVaultUpdates } from '@/lib/repositories/content-repository';

export default async function VaultDashboardPage() {
  const [featuredDrop, updates] = await Promise.all([
    Promise.resolve(getFeaturedMonthlyDrop()),
    Promise.resolve(getPublicVaultUpdates()),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <VaultPageHeader
        eyebrow="Builder Pass"
        title="Welcome back"
        subtitle="Your Builder Journey continues here."
      />

      <GlobalSearch />

      {featuredDrop && <MonthlyDropCard drop={featuredDrop} />}

      <OnboardingChecklist />

      <div className="grid gap-6 lg:grid-cols-2">
        <WhatsNew />

        <VaultCard compact>
          <h2 className="font-semibold text-white">Latest updates</h2>
          <ul className="mt-4 space-y-3">
            {updates.slice(0, 5).map((u) => (
              <li key={u.id} className="border-b border-white/10 pb-3 last:border-0">
                <p className="font-medium text-zinc-200">{u.title}</p>
                <p className="text-sm text-zinc-500">{u.description}</p>
              </li>
            ))}
          </ul>
        </VaultCard>
      </div>
    </div>
  );
}
