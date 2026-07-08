'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetupWizard } from '@/components/setup-wizard/setup-wizard';
import { hasVaultAccess } from '@/lib/auth/permissions';
import type { UserProfile } from '@/types';

export default function StartHereLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/auth/session'), fetch('/api/setup-wizard')])
      .then(([sessionRes, wizardRes]) =>
        Promise.all([sessionRes.json(), wizardRes.json()])
      )
      .then(([sessionData, wizardData]) => {
        const user = sessionData.user as UserProfile | null;
        if (!user || !hasVaultAccess(user.role)) {
          router.replace('/login?redirect=/start-here');
          return;
        }
        if (wizardData.completed) {
          router.replace('/vault');
          return;
        }
        setReady(true);
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
