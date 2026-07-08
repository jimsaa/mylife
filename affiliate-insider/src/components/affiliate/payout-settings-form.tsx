'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { InputDark } from '@/components/ui/input';
import { PayoutRulesCard } from '@/components/affiliate/payout-rules-card';
import { vaultPanelClass } from '@/components/vault/vault-ui';
import { cn } from '@/lib/utils';
import type { AffiliatePayoutSettings } from '@/types/affiliate';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'SEK', 'CAD', 'AUD'];

export function PayoutSettingsForm() {
  const [form, setForm] = useState({
    paypal_email: '',
    full_name: '',
    country: '',
    preferred_currency: 'USD',
  });
  const [rules, setRules] = useState<{
    minimum_payout_cents: number;
    payout_method: string;
    payout_schedule: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/affiliate/payout-settings'), fetch('/api/affiliate/dashboard')])
      .then(([s, d]) => Promise.all([s.json(), d.json()]))
      .then(([settingsData, dashboardData]) => {
        if (settingsData.settings) {
          const s = settingsData.settings as AffiliatePayoutSettings;
          setForm({
            paypal_email: s.paypal_email,
            full_name: s.full_name,
            country: s.country,
            preferred_currency: s.preferred_currency,
          });
        }
        if (dashboardData.payout_rules) setRules(dashboardData.payout_rules);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await fetch('/api/affiliate/payout-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {rules && <PayoutRulesCard rules={rules} />}

      <div className={cn(vaultPanelClass, 'p-6')}>
        <h1 className="text-xl font-semibold text-white">Payout settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          We pay affiliates manually via PayPal. Accurate details help us pay you faster.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-400">PayPal email</span>
            <InputDark
              type="email"
              className="mt-1"
              value={form.paypal_email}
              onChange={(e) => setForm((f) => ({ ...f, paypal_email: e.target.value }))}
              placeholder="you@paypal.com"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-400">Full name</span>
            <InputDark
              className="mt-1"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Legal name for PayPal"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-400">Country</span>
            <InputDark
              className="mt-1"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              placeholder="Sweden"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-400">Preferred currency</span>
            <select
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              value={form.preferred_currency}
              onChange={(e) => setForm((f) => ({ ...f, preferred_currency: e.target.value }))}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-zinc-900">
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <Button onClick={save} disabled={saving || !form.paypal_email || !form.full_name}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {saved && <span className="text-sm text-emerald-400">Settings saved</span>}
        </div>
      </div>
    </div>
  );
}
