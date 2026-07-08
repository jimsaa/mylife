import { cn } from '@/lib/utils';

export function Section({
  id,
  children,
  className,
  narrow,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <section id={id} className={cn('px-4 py-20 sm:py-28', className)}>
      <div className={cn('mx-auto', narrow ? 'max-w-3xl' : 'max-w-6xl')}>{children}</div>
    </section>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={cn('mb-12', center && 'text-center')}>
      {eyebrow && (
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-400">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className={cn('mt-4 text-lg text-zinc-400', center && 'mx-auto max-w-2xl')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
