'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CardDark } from '@/components/ui/card';
import { InputDark } from '@/components/ui/input';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/vault';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('redirect') === '/admin') {
      setEmail('admin@jimsaari.se');
    }
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: email.split('@')[0] }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Login failed');
      return;
    }
    if (data.user?.role === 'ADMIN') {
      router.push('/admin');
      return;
    }
    if (!data.user?.onboarding_completed_at) {
      router.push('/start-here');
      return;
    }
    router.push(redirect === '/start-here' ? '/vault' : redirect);
  };

  return (
    <CardDark className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-white">Welcome back</h1>
      <p className="mt-2 text-zinc-400">Log in to your Vault.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-400">Email</span>
          <InputDark type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-400">Password</span>
          <InputDark type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" required />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Log in'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Admin: <span className="text-zinc-400">admin@jimsaari.se</span>
      </p>
      <p className="mt-2 text-center text-sm text-zinc-500">
        <Link href="/checkout" className="text-violet-400 hover:underline">
          Get access
        </Link>
      </p>
    </CardDark>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Suspense fallback={<p className="text-zinc-400">Loading...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
