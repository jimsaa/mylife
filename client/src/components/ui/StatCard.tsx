interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  indicator?: 'green' | 'yellow' | 'red';
}

const indicatorColors = {
  green: 'border-l-emerald-500',
  yellow: 'border-l-amber-500',
  red: 'border-l-red-500',
};

export function StatCard({ label, value, hint, indicator }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface p-4 shadow-sm ${indicator ? `border-l-4 ${indicatorColors[indicator]}` : ''}`}
    >
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
