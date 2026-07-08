'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VaultSidebar } from '@/components/vault/sidebar';
import { VaultBackgroundOrbs } from '@/components/vault/vault-ui';
import { hasAdminAccess, hasVaultAccess } from '@/lib/auth/permissions';
import type { UserProfile } from '@/types';

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/auth/session'), fetch('/api/setup-wizard')])
      .then(([sessionRes, wizardRes]) =>
        Promise.all([sessionRes.json(), wizardRes.json()])
      )
      .then(([sessionData, wizardData]) => {
        const sessionUser = sessionData.user as UserProfile | null;
        if (!sessionUser || !hasVaultAccess(sessionUser.role)) {
          router.replace('/login');
          return;
        }
        if (!wizardData.completed && !hasAdminAccess(sessionUser.role)) {
          router.replace('/start-here');
          return;
        }
        setUser(wizardData.user ?? sessionUser);
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Loading...
      </div>
    );
  }

  if (!user || !hasVaultAccess(user.role)) return null;

  return (
    <div className="relative flex min-h-screen bg-zinc-950">
      <VaultBackgroundOrbs />
      <VaultSidebar adminLink={hasAdminAccess(user.role)} />
      <main className="relative flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}
