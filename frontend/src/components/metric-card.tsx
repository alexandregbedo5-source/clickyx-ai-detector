interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}

export function MetricCard({ label, value, hint, highlight }: MetricCardProps) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        borderColor: highlight ? "var(--primary)" : "var(--border)",
        background: highlight ? "rgba(79,140,255,0.07)" : "var(--surface)",
      }}
    >
      <p className="text-xs text-muted">{label}</p>
      <p
        className="mt-2 font-mono text-3xl font-semibold tracking-tight"
        style={{ color: highlight ? "var(--primary)" : "var(--foreground)" }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
