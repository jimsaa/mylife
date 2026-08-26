import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { legacyApi } from '../api';
import { ADMIN_BASE } from '../lib/constants';
import type { LegacyInstructionSection } from '../types';

/**
 * Family handbook — read-only for legacy contacts.
 * Content is fully editable by the owner in Digital Legacy admin.
 */
export function LegacyInstructionsPage() {
  const [sections, setSections] = useState<LegacyInstructionSection[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirect, setRedirect] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

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

        if (!session.legacy_intro_completed) {
          setRedirect('/legacy/welcome');
          return;
        }

        const data = await legacyApi.publicInstructions();
        if (!active) return;
        setSections(data.sections);
        setUpdatedAt(data.updated_at);
        setActiveId(data.sections[0]?.id ?? null);
        setLoading(false);
      } catch {
        if (active) setLoading(false);
      }
    }

    void boot();
    return () => {
      active = false;
    };
  }, []);

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

  const active = sections.find((s) => s.id === activeId) ?? sections[0];

  return (
    <div className="min-h-screen bg-[#f7f6f3] text-stone-900">
      <header className="border-b border-stone-200 bg-[#f7f6f3]">
        <div className="mx-auto flex max-w-5xl items-baseline justify-between gap-4 px-6 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-stone-400">
              My Life · Digital Legacy
            </p>
            <h1 className="mt-2 font-serif text-3xl tracking-tight">Legacy Instructions</h1>
          </div>
          <Link
            to={ADMIN_BASE}
            className="shrink-0 text-sm text-stone-600 underline-offset-4 hover:underline"
          >
            Enter My Life
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-6 py-10 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-1 lg:sticky lg:top-8 lg:self-start">
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveId(section.id)}
              className={`block w-full rounded px-3 py-2 text-left text-sm transition ${
                active?.id === section.id
                  ? 'bg-stone-900 text-stone-50'
                  : 'text-stone-600 hover:bg-stone-200/60'
              }`}
            >
              <span className="mr-2 text-xs opacity-60">{index + 1}.</span>
              {section.title}
            </button>
          ))}
        </nav>

        <article className="min-w-0">
          {active ? (
            <>
              <h2 className="font-serif text-3xl tracking-tight text-stone-900">{active.title}</h2>
              <p className="mt-2 text-xs text-stone-400">
                Last modified {new Date(active.updated_at).toLocaleString()}
                {updatedAt && ` · Handbook updated ${new Date(updatedAt).toLocaleString()}`}
              </p>
              <div className="mt-8 whitespace-pre-wrap font-serif text-lg leading-relaxed text-stone-700">
                {active.body}
              </div>
            </>
          ) : (
            <p className="text-stone-500">No instructions have been written yet.</p>
          )}
        </article>
      </div>
    </div>
  );
}
