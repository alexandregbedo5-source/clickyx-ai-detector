interface VerdictBadgeProps {
  isAi: boolean;
  confidence: number;
}

export function VerdictBadge({ isAi, confidence }: VerdictBadgeProps) {
  const pct = Math.round(confidence * 100);
  return (
    <div
      className="flex items-center gap-4 rounded-xl border p-4"
      style={{
        borderColor: isAi ? "var(--danger)" : "var(--success)",
        background: isAi ? "var(--danger-soft)" : "var(--success-soft)",
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{
          background: isAi ? "rgba(255,93,108,0.18)" : "rgba(55,211,154,0.18)",
          color: isAi ? "var(--danger)" : "var(--success)",
        }}
      >
        {isAi ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 2 1 21h22L12 2Zm0 6 6.5 11h-13L12 8Z" fill="currentColor" />
            <rect x="11" y="10" width="2" height="5" fill="currentColor" />
            <rect x="11" y="16" width="2" height="2" fill="currentColor" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M20 6 9 17l-5-5 1.4-1.4L9 14.2 18.6 4.6 20 6Z"
              fill="currentColor"
            />
          </svg>
        )}
      </div>
      <div>
        <p className="text-lg font-semibold leading-tight">
          {isAi ? "Image probablement générée par IA" : "Image probablement authentique"}
        </p>
        <p className="text-sm text-muted">
          Probabilité qu&apos;elle soit générée par IA&nbsp;:{" "}
          <span className="font-mono text-foreground">{pct}%</span>
        </p>
      </div>
    </div>
  );
}
