import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { legacyApi } from '../api';

/**
 * Public Digital Legacy portal at /legacy
 * Token-based claim + password creation. Never receives passwords by email.
 */
export function LegacyPortalPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [phase, setPhase] = useState<
    'loading' | 'claim' | 'login' | 'error'
  >('loading');
  const [contactName, setContactName] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [email, setEmail] = useState('');

  const hasToken = useMemo(() => token.length > 0, [token]);

  function afterAuth(introCompleted: boolean) {
    window.location.href = introCompleted ? '/legacy/instructions' : '/legacy/welcome';
  }

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const session = await legacyApi.publicSession();
        if (!active) return;
        if (session.authenticated) {
          afterAuth(!!session.legacy_intro_completed);
          return;
        }

        if (hasToken) {
          const verified = await legacyApi.publicVerify(token);
          if (!active) return;
          if (!verified.ok) {
            setError(mapError(verified.error));
            setPhase('error');
            return;
          }
          setContactName(verified.contact?.name ?? '');
          setExpiresAt(verified.expires_at ?? null);
          setPhase('claim');
          return;
        }

        setPhase('login');
      } catch {
        if (active) {
          setError('Kunde inte ansluta till servern.');
          setPhase('error');
        }
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, [hasToken, token]);

  async function handleClaim(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 10) {
      setError('Lösenordet måste vara minst 10 tecken.');
      return;
    }
    if (password !== password2) {
      setError('Lösenorden matchar inte.');
      return;
    }
    try {
      const result = await legacyApi.publicClaim(token, password);
      if (!result.ok) {
        setError(mapError(result.error));
        return;
      }
      afterAuth(!!result.legacy_intro_completed);
    } catch {
      setError('Kunde inte skapa konto. Token kan vara ogiltig eller använd.');
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await legacyApi.publicLogin(email, password);
      if (!result.ok) {
        setError('Fel e-post eller lösenord.');
        return;
      }
      afterAuth(!!result.legacy_intro_completed);
    } catch {
      setError('Fel e-post eller lösenord.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3] px-4 py-10 text-stone-900">
      <div className="w-full max-w-md border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-stone-400">
          My Life
        </p>
        <h1 className="mt-2 text-center font-serif text-2xl tracking-wide">
          Digital Legacy
        </h1>

        {phase === 'loading' && (
          <p className="mt-8 text-center text-sm text-stone-500">Verifierar…</p>
        )}

        {phase === 'error' && (
          <div className="mt-8 space-y-4 text-center">
            <p className="text-sm text-red-700">{error ?? 'Ogiltig länk.'}</p>
            <Link to="/legacy" className="text-sm text-stone-600 underline">
              Gå till inloggning
            </Link>
          </div>
        )}

        {phase === 'claim' && (
          <form className="mt-8 space-y-4" onSubmit={handleClaim}>
            <p className="text-sm text-stone-600">
              Hej <strong>{contactName}</strong>. Verifiera din engångslänk och skapa ett eget
              lösenord. Inga lösenord skickas via e-post.
            </p>
            {expiresAt && (
              <p className="text-xs text-stone-400">
                Länken går ut: {new Date(expiresAt).toLocaleString()}
              </p>
            )}
            <input
              type="password"
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-800"
              placeholder="Nytt lösenord (minst 10 tecken)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
            <input
              type="password"
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-800"
              placeholder="Bekräfta lösenord"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={10}
              autoComplete="new-password"
            />
            {error && <p className="text-center text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              className="w-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-50 hover:bg-stone-800"
            >
              Skapa lösenord & aktivera
            </button>
          </form>
        )}

        {phase === 'login' && (
          <form className="mt-8 space-y-4" onSubmit={handleLogin}>
            <p className="text-sm text-stone-500">
              Logga in med det lösenord du skapade via din säkra engångslänk.
            </p>
            <input
              type="email"
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-800"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
            <input
              type="password"
              className="w-full border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-800"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <p className="text-center text-sm text-red-700">{error}</p>}
            <button
              type="submit"
              className="w-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-stone-50 hover:bg-stone-800"
            >
              Logga in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export function LegacyConfirmPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Saknar token.');
      return;
    }
    legacyApi
      .publicConfirm(token)
      .then((result) => {
        if (result.ok) {
          setStatus('ok');
          setMessage(result.message ?? 'Bekräftat.');
        } else {
          setStatus('error');
          setMessage(mapError(result.error));
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Bekräftelsen misslyckades. Länken kan vara ogiltig eller redan använd.');
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3] px-4 text-stone-900">
      <div className="w-full max-w-md border border-stone-200 bg-white p-8 text-center">
        <h1 className="font-serif text-xl">My Life — Life Check</h1>
        {status === 'loading' && <p className="mt-6 text-sm text-stone-500">Bekräftar…</p>}
        {status === 'ok' && (
          <p className="mt-6 text-sm text-stone-700">
            {message}
            <br />
            <span className="text-stone-400">Du kan stänga detta fönster.</span>
          </p>
        )}
        {status === 'error' && <p className="mt-6 text-sm text-red-700">{message}</p>}
      </div>
    </div>
  );
}

function mapError(code?: string): string {
  switch (code) {
    case 'expired':
      return 'Länken har gått ut.';
    case 'already_used':
      return 'Länken har redan använts.';
    case 'invalid_signature':
    case 'not_found':
      return 'Ogiltig länk.';
    case 'password_too_short':
      return 'Lösenordet måste vara minst 10 tecken.';
    case 'revoked':
      return 'Länken har återkallats.';
    default:
      return code ? `Fel: ${code}` : 'Något gick fel.';
  }
}
