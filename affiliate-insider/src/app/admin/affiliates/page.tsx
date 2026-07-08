'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StatWidget } from '@/components/admin/stat-widget';
import type { AffiliateAdminStats, AffiliateCommission, AffiliateProfile } from '@/types/affiliate';

interface AffiliateRow extends AffiliateProfile {
  email: string;
  full_name: string | null;
}

export default function AdminAffiliatesPage() {
  const [stats, setStats] = useState<AffiliateAdminStats | null>(null);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch('/api/admin/affiliates')
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setAffiliates(d.affiliates);
        setCommissions(d.commissions);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateAffiliate = async (id: string, action: string, extra?: Record<string, unknown>) => {
    await fetch(`/api/admin/affiliates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    });
    load();
  };

  if (loading || !stats) {
    return <p className="text-zinc-500">Loading affiliates...</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Affiliate Center</h1>
          <p className="text-zinc-500">Manage affiliates, commissions, and payout exports.</p>
        </div>
        <a
          href="/api/admin/affiliates/payouts/export"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Export CSV
        </a>
        <Link
          href="/admin/affiliates/payouts"
          className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-violet-700 hover:bg-zinc-50"
        >
          Payout management →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatWidget label="Total Affiliates" value={stats.total_affiliates} />
        <StatWidget label="Active" value={stats.active_affiliates} />
        <StatWidget label="Total Sales" value={stats.total_sales} />
        <StatWidget
          label="Pending Payout"
          value={`$${(stats.pending_payout_cents / 100).toFixed(2)}`}
          hint={`$${(stats.lifetime_paid_cents / 100).toFixed(2)} paid lifetime`}
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-5">
          <h2 className="font-semibold text-zinc-900">Affiliates</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-400">
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Level</th>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {affiliates.map((a) => (
                <tr key={a.id} className="border-b border-zinc-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-zinc-900">{a.email}</p>
                    <p className="text-xs text-zinc-400">{a.full_name ?? '—'}</p>
                  </td>
                  <td className="px-5 py-4 capitalize text-zinc-600">{a.status}</td>
                  <td className="px-5 py-4 text-zinc-600">{a.partner_level}</td>
                  <td className="px-5 py-4 font-mono text-xs text-zinc-500">{a.referral_code}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {a.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => updateAffiliate(a.id, 'approve')}
                          className="text-xs text-violet-600 hover:underline"
                        >
                          Approve
                        </button>
                      )}
                      {a.status !== 'disabled' && (
                        <button
                          type="button"
                          onClick={() => updateAffiliate(a.id, 'disable', { reason: 'Admin disabled' })}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Disable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 p-5">
          <h2 className="font-semibold text-zinc-900">Commissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-xs uppercase text-zinc-400">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Affiliate</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => {
                const aff = affiliates.find((a) => a.id === c.affiliate_id);
                return (
                  <tr key={c.id} className="border-b border-zinc-50">
                    <td className="px-5 py-4 text-zinc-600">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-zinc-600">{aff?.email ?? c.affiliate_id}</td>
                    <td className="px-5 py-4 text-zinc-600">{c.product}</td>
                    <td className="px-5 py-4">${(c.amount_cents / 100).toFixed(2)}</td>
                    <td className="px-5 py-4 capitalize">{c.status}</td>
                    <td className="px-5 py-4">
                      {c.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() =>
                            updateAffiliate(c.affiliate_id, 'approve_commission', {
                              commission_id: c.id,
                            })
                          }
                          className="text-xs text-violet-600 hover:underline"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-sm text-zinc-500">
        <Link href="/vault/affiliate" className="text-violet-600 hover:underline">
          View member Affiliate Center →
        </Link>
      </p>
    </div>
  );
}
