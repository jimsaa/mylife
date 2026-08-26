import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { legacyApi } from '../api';
import { ADMIN_BASE } from '../lib/constants';

/**
 * First-time welcome for legacy contacts after account activation.
 * Shown only while legacy_intro_completed is false.
 */
export function LegacyWelcomePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirect, setRedirect] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function boot() {
      try {
        const session = await legacyApi.publicSession();
        if (!active) return;

        if (!session.authenticated) {
          setRedirect('/legacy');
          return;
        }

        if (session.legacy_intro_completed) {
          setRedirect(`${ADMIN_BASE}/arv?tab=instructions`);
          return;
        }

        const welcome = await legacyApi.publicWelcome();
        if (!active) return;
        setTitle(welcome.title);
        setBody(welcome.body);
        setLoading(false);
      } catch {
        if (active) {
          setError('Could not load the welcome message.');
          setLoading(false);
        }
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

  async function handleContinue() {
    setSubmitting(true);
    setError(null);
    try {
      await legacyApi.publicCompleteIntro();
      // Spec: mark intro complete, then open the family handbook.
      // From instructions, "Enter My Life" goes to /admin.
      navigate('/legacy/instructions', { replace: true });
    } catch {
      setError('Could not continue. Please try again.');
      setSubmitting(false);
    }
  }

  if (redirect) {
    return <Navigate to={redirect} replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f6f3] text-stone-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-stone-400">My Life · Digital Legacy</p>
        <h1 className="mt-6 font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">
          {title}
        </h1>
        <div className="mt-10 whitespace-pre-wrap font-serif text-lg leading-relaxed text-stone-700">
          {body}
        </div>

        {error && <p className="mt-8 text-sm text-red-700">{error}</p>}

        <div className="mt-12">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleContinue()}
            className="border border-stone-800 bg-stone-900 px-6 py-3 text-sm font-medium tracking-wide text-stone-50 transition hover:bg-stone-800 disabled:opacity-50"
          >
            {submitting ? 'Continuing…' : 'Continue to Legacy Instructions'}
          </button>
        </div>
      </div>
    </div>
  );
}
