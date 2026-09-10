import { formatProbability } from "@/lib/format";

interface ScoreBarProps {
  label: string;
  value: number;
  description?: string;
}

function colorFor(value: number): string {
  if (value >= 0.66) return "var(--danger)";
  if (value >= 0.33) return "var(--warning)";
  return "var(--success)";
}

export function ScoreBar({ label, value, description }: ScoreBarProps) {
  const width = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="font-mono text-sm text-muted">{formatProbability(value)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${width}%`, background: colorFor(value) }}
        />
      </div>
      {description ? (
        <p className="mt-1 text-xs text-muted">{description}</p>
      ) : null}
    </div>
  );
}
