const HARDCODED_CARDS = [
  {
    id: 'disco-taxi',
    title: 'Disco Taxi',
    url: 'https://discotaxi.se',
    image_url: '/project-cards/disco-taxi.png',
  },
] as const;

/**
 * Public homepage — hero + hardcoded project cards (static assets).
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden px-6 pb-6 pt-16 sm:pt-20">
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
          <h1 className="text-3xl font-semibold tracking-wide text-white sm:text-4xl md:text-5xl">
            Jim Saari - This is My Life
          </h1>
        </div>
      </section>

      <section
        aria-labelledby="project-cards-heading"
        className="relative px-4 pb-16 pt-4 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="project-cards-heading"
            className="mb-6 text-center text-sm font-medium tracking-wide text-slate-400 sm:text-base"
          >
            I&apos;m currently active in these projects
          </h2>

          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-5">
            {HARDCODED_CARDS.map((card) => (
              <li key={card.id}>
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
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
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
