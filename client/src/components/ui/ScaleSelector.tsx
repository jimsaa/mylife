interface ScaleSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
  labels: Record<number, string>;
}

export function ScaleSelector({ value, onChange, labels }: ScaleSelectorProps) {
  const levels = Object.keys(labels).map(Number).sort();

  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
            value === level
              ? 'border-accent bg-teal-50 text-accent'
              : 'border-border bg-surface text-text hover:bg-surface-muted'
          }`}
        >
          <span className="font-semibold">{level}</span>
          <span className="ml-2 text-text-muted">{labels[level]}</span>
        </button>
      ))}
    </div>
  );
}
