'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatUsd, payoutMethodLabel } from '@/lib/affiliate/format';
import type { AffiliatePayout, AffiliatePayoutAdminRow } from '@/types/affiliate';

interface PayoutAdminData {
  config: {
    minimum_payout_cents: number;
    payout_method: string;
    payout_schedule: string;
    payout_method_label: string;
  };
  affiliates: AffiliatePayoutAdminRow[];
  payouts: AffiliatePayout[];
}

export default function AdminPayoutsPage() {
  const [data, setData] = useState<PayoutAdminData | null>(null);
  const [minPayout, setMinPayout] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () => {
    fetch('/api/admin/affiliates/payouts')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setMinPayout(String((d.config.minimum_payout_cents / 100).toFixed(0)));
      });
  };

  useEffect(() => {
    load();
  }, []);

  const markPaid = async (affiliateId: string) => {
    await fetch('/api/admin/affiliates/payouts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_paid',
        affiliate_id: affiliateId,
        notes: notes[affiliateId] || undefined,
      }),
    });
    load();
  };

  const saveConfig = async () => {
    await fetch('/api/admin/affiliates/payouts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_config',
        minimum_payout_cents: Math.round(parseFloat(minPayout) * 100),
      }),
    });
    load();
  };

  if (!data) return <p className="text-zinc-500">Loading payouts...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Payout management</h1>
          <p className="text-zinc-500">Manual PayPal payouts — no automation in V1.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/admin/affiliates/payouts/export"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Export CSV
          </a>
          <Link
            href="/admin/affiliates"
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            All affiliates
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="font-semibold text-zinc-900">Program settings</h2>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label>
            <span className="text-xs text-zinc-500">Minimum payout (USD)</span>
            <input
              type="number"
              className="mt-1 block w-24 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              value={minPayout}
              onChange={(e) => setMinPayout(e.target.value)}
            />
          </label>
          <p className="text-sm text-zinc-600">
            Method: {data.config.payout_method_label} · Schedule: {data.config.payout_schedule}
          </p>
          <button
            type="button"
            onClick={saveConfig}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Save minimum
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-5">
          <h2 className="font-semibold text-zinc-900">Ready to pay</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-400">
                <th className="px-5 py-3">Affiliate</th>
                <th className="px-5 py-3">PayPal email</th>
                <th className="px-5 py-3">Approved balance</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.affiliates.map((row) => (
                <tr key={row.affiliate_id} className="border-b border-zinc-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-zinc-900">{row.email}</p>
                    <p className="text-xs text-zinc-400">{row.full_name ?? '—'}</p>
                  </td>
                  <td className="px-5 py-4 text-zinc-600">
                    {row.paypal_email ?? (
                      <span className="text-amber-600">Not set</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-medium tabular-nums">
                    {formatUsd(row.approved_balance_cents)}
                  </td>
                  <td className="px-5 py-4">
                    <input
                      type="text"
                      placeholder="PayPal ref / notes"
                      className="w-full min-w-[140px] rounded border border-zinc-200 px-2 py-1 text-xs"
                      value={notes[row.affiliate_id] ?? ''}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [row.affiliate_id]: e.target.value }))
                      }
                    />
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      disabled={!row.eligible_for_payout}
                      onClick={() => markPaid(row.affiliate_id)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Mark as paid
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-5">
          <h2 className="font-semibold text-zinc-900">Payout history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-400">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Affiliate</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.payouts.map((p) => {
                const aff = data.affiliates.find((a) => a.affiliate_id === p.affiliate_id);
                return (
                  <tr key={p.id} className="border-b border-zinc-50">
                    <td className="px-5 py-4 text-zinc-600">
                      {new Date(p.paid_at ?? p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">{aff?.email ?? p.affiliate_id}</td>
                    <td className="px-5 py-4">{formatUsd(p.amount_cents)}</td>
                    <td className="px-5 py-4">{payoutMethodLabel(p.payment_method)}</td>
                    <td className="px-5 py-4 capitalize">{p.status}</td>
                    <td className="px-5 py-4 font-mono text-xs">{p.reference ?? '—'}</td>
                    <td className="px-5 py-4 text-zinc-500">{p.notes ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
