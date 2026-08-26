import { useEffect, useState } from 'react';
import { projectCardApi } from '../api';
import type { ProjectCard } from '../types';

function isExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin !== window.location.origin;
  } catch {
    return false;
  }
}

/**
 * Public homepage — keeps existing hero; adds DB-driven project cards below.
 */
export function LandingPage() {
  const [cards, setCards] = useState<ProjectCard[] | null>(null);

  useEffect(() => {
    let active = true;
    projectCardApi
      .listPublic()
      .then((data) => {
        if (active) setCards(data);
      })
      .catch(() => {
        if (active) setCards([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasCards = (cards?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden px-6">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(15, 118, 110, 0.18), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 100%, rgba(30, 41, 59, 0.9), transparent 50%)',
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4rem]" />

        <div className="relative text-center">
          <h1 className="text-4xl font-semibold tracking-[0.35em] text-white sm:text-5xl md:text-6xl">
            JIM SAARI
          </h1>
          <p className="mt-6 text-sm font-medium uppercase tracking-[0.45em] text-slate-400 sm:text-base">
            Under Development
          </p>
        </div>
      </section>

      {hasCards && (
        <section
          aria-labelledby="project-cards-heading"
          className="relative border-t border-white/5 px-4 pb-20 pt-10 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-5xl">
            <h2
              id="project-cards-heading"
              className="mb-8 text-center text-xs font-medium uppercase tracking-[0.35em] text-slate-500"
            >
              Projects
            </h2>

            <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
              {cards!.map((card) => {
                const external = isExternalUrl(card.url);
                return (
                  <li key={card.id}>
                    <a
                      href={card.url}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="group block overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 outline-none transition hover:border-teal-500/40 focus-visible:ring-2 focus-visible:ring-teal-400"
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-slate-800">
                        <img
                          src={card.image_url}
                          alt={card.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      </div>
                      <div className="px-3 py-3 sm:px-4 sm:py-3.5">
                        <h3 className="text-sm font-semibold tracking-wide text-white sm:text-base">
                          {card.title}
                        </h3>
                        {card.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400 sm:text-sm">
                            {card.description}
                          </p>
                        )}
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
