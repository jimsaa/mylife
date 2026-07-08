import { type FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { ADMIN_BASE, ADMIN_LOGIN } from '../lib/constants';
import { useAdminRobotsMeta } from '../lib/auth/useAdminRobotsMeta';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function AdminLoginPage() {
  useAdminRobotsMeta();
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from?.startsWith(ADMIN_BASE) &&
    (location.state as { from?: string }).from !== ADMIN_LOGIN
      ? (location.state as { from: string }).from
      : ADMIN_BASE;

  useEffect(() => {
    authApi.session().then((result) => {
      if (result.authenticated) navigate(from, { replace: true });
    });
  }, [from, navigate]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await authApi.login(password);
      navigate(from, { replace: true });
    } catch {
      setError('Incorrect password.');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-text">My Life</h1>
        <p className="mt-2 text-center text-sm text-text-muted">Enter password to continue</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            autoFocus
            required
          />

          {error && <p className="text-center text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
