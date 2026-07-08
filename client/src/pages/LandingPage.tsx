export function LandingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6">
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
    </div>
  );
}
