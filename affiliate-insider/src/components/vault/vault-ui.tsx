import { cn } from '@/lib/utils';

/** Matches onboarding WizardCard — single source for Builder Pass member UI */
export const vaultCardClass =
  'rounded-2xl border border-white/10 bg-zinc-900/80 shadow-2xl shadow-violet-950/20 backdrop-blur-sm';

export const vaultCardPadding = 'p-6 sm:p-8';

export const vaultCardFeaturedClass =
  'rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-zinc-900/80 shadow-2xl shadow-violet-950/20 backdrop-blur-sm';

export const vaultPanelClass =
  'rounded-xl border border-white/10 bg-zinc-900/80 shadow-lg shadow-violet-950/10 backdrop-blur-sm';

export function VaultBackgroundOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-violet-600/15 blur-[120px]" />
      <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-fuchsia-600/10 blur-[80px]" />
    </div>
  );
}

export function VaultCard({
  children,
  className,
  featured,
  compact,
}: {
  children: React.ReactNode;
  className?: string;
  featured?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        featured ? vaultCardFeaturedClass : vaultCardClass,
        compact ? 'p-5' : vaultCardPadding,
        className
      )}
    >
      {children}
    </div>
  );
}

export function VaultPageHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-2 text-sm font-medium text-violet-400">{eyebrow}</p>
      )}
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 text-base leading-relaxed text-zinc-400">{subtitle}</p>}
    </div>
  );
}

export function VaultFilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border border-violet-500/30 bg-violet-600/20 text-violet-200'
          : 'border border-transparent bg-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
      )}
    >
      {children}
    </button>
  );
}

export function VaultProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
      <div
        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
