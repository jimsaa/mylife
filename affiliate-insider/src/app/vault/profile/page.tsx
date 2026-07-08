'use client';

import { useEffect, useState } from 'react';
import { VaultCard, VaultPageHeader } from '@/components/vault/vault-ui';
import type { UserProfile } from '@/types';

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetch('/api/auth/session').then((r) => r.json()).then((d) => setUser(d.user));
  }, []);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <VaultPageHeader title="Profile" subtitle="Your account details." />

      <VaultCard compact className="space-y-4">
        <div>
          <p className="text-sm text-zinc-500">Name</p>
          <p className="font-medium text-white">{user.full_name ?? '—'}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Email</p>
          <p className="font-medium text-white">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Membership</p>
          <p className="inline-block rounded-full border border-violet-500/20 bg-violet-600/10 px-3 py-1 text-sm font-medium text-violet-300">
            Builder Pass
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500">Member since</p>
          <p className="font-medium text-white">
            {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      </VaultCard>
    </div>
  );
}
