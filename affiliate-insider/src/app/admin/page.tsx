'use client';

import { useEffect, useState } from 'react';
import { StatWidget } from '@/components/admin/stat-widget';
import type { AdminStats, AnalyticsPlaceholders } from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsPlaceholders | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setAnalytics(d.analytics);
      });
  }, []);

  if (!stats) return <p className="text-zinc-500">Loading dashboard...</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500">Product overview — no database access required.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatWidget label="Total Members" value={stats.total_members} />
        <StatWidget label="Builder Pass" value={stats.vault_members} />
        <StatWidget label="Monthly Build Pro" value={stats.vip_members} hint="Subscription members" />
        <StatWidget
          label="Products Sold"
          value={stats.products_sold}
          hint={
            stats.conversion_rate !== null
              ? `${stats.conversion_rate}% conversion`
              : 'Placeholder until traffic'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Recent signups</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {stats.recent_signups.length === 0 ? (
              <li className="py-3 text-sm text-zinc-500">No signups yet</li>
            ) : (
              stats.recent_signups.map((u) => (
                <li key={u.id} className="flex justify-between py-3 text-sm">
                  <span>{u.email}</span>
                  <span className="text-zinc-400">{u.role}</span>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Recent purchases</h2>
          <ul className="mt-4 divide-y divide-zinc-100">
            {stats.recent_purchases.length === 0 ? (
              <li className="py-3 text-sm text-zinc-500">No purchases yet</li>
            ) : (
              stats.recent_purchases.map((p) => (
                <li key={p.id} className="flex justify-between py-3 text-sm">
                  <span>{p.email}</span>
                  <span className="text-zinc-400">${(p.amount_cents / 100).toFixed(0)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {analytics && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-900">Analytics (placeholders)</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-dashed border-zinc-200 p-4">
              <p className="text-xs font-medium uppercase text-zinc-400">Most viewed tools</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                {analytics.most_viewed_tools.map((t) => (
                  <li key={t.name}>
                    {t.name} — {t.views} views
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-dashed border-zinc-200 p-4">
              <p className="text-xs font-medium uppercase text-zinc-400">Most copied prompts</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                {analytics.most_copied_prompts.map((p) => (
                  <li key={p.title}>
                    {p.title} — {p.copies}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-dashed border-zinc-200 p-4">
              <p className="text-xs font-medium uppercase text-zinc-400">Favorite AI tools</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                {analytics.favorite_ai_tools.map((t) => (
                  <li key={t.name}>
                    {t.name} — {t.saves} saves
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
