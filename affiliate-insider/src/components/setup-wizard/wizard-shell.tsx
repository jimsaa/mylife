'use client';

import { cn } from '@/lib/utils';

export function WizardProgress({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-zinc-400">
          Step {step} of {total}
        </span>
        <span className="text-zinc-500">{Math.round((step / total) * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500 ease-out"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function WizardShell({
  step,
  children,
}: {
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <p className="mb-2 text-center text-sm font-medium text-violet-400">
        Welcome to Builder Pass
      </p>
      <WizardProgress step={step} />
      <div className="mt-10">{children}</div>
    </div>
  );
}

export function WizardCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl shadow-violet-950/20 backdrop-blur-sm sm:p-10',
        className
      )}
    >
      {children}
    </div>
  );
}

export function WizardTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-3 text-base leading-relaxed text-zinc-400">{subtitle}</p>}
    </div>
  );
}

export function WizardPrimaryButton({
  children,
  onClick,
  href,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  type?: 'button' | 'submit';
}) {
  const className =
    'flex w-full items-center justify-center rounded-xl bg-violet-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-violet-500';

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

export function WizardSecondaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
    >
      {children}
    </button>
  );
}
