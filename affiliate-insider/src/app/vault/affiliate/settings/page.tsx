'use client';

import { AffiliateNav } from '@/components/affiliate/affiliate-nav';
import { PayoutSettingsForm } from '@/components/affiliate/payout-settings-form';
import { VaultPageHeader } from '@/components/vault/vault-ui';

export default function AffiliatePayoutSettingsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <VaultPageHeader
        title="Affiliate Center"
        subtitle="Configure how you receive payouts."
      />
      <AffiliateNav />
      <PayoutSettingsForm />
    </div>
  );
}
