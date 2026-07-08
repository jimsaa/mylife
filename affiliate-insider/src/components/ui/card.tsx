import { cn } from '@/lib/utils';

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardDark({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm',
        className
      )}
    >
      {children}
    </div>
  );
}
