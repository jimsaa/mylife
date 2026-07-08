'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CardDark } from '@/components/ui/card';
import { InputDark } from '@/components/ui/input';

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkoutEmail = sessionStorage.getItem('checkout_email');
    if (checkoutEmail) setEmail(checkoutEmail);
  }, [searchParams]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Signup failed');
      return;
    }
    router.push('/start-here');
  };

  return (
    <CardDark className="w-full max-w-md">
      <h1 className="text-2xl font-bold text-white">Create your account</h1>
      <p className="mt-2 text-zinc-400">Purchase complete. Set your password to access the Vault.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <label className="block">
          <span className="text-sm text-zinc-400">Full name</span>
          <InputDark value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" required />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-400">Email</span>
          <InputDark type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" required />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-400">Password</span>
          <InputDark type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" minLength={8} required />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating...' : 'Access Vault'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="text-violet-400 hover:underline">
          Log in
        </Link>
      </p>
    </CardDark>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Suspense fallback={<p className="text-zinc-400">Loading...</p>}>
        <SignUpForm />
      </Suspense>
    </div>
  );
}
