"use client";

import { useEffect, useState } from "react";
import type { HealthResponse } from "@/lib/types";

export function DetectorStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        const data = (await res.json()) as HealthResponse;
        if (!cancelled) setHealth(data);
      } catch {
        if (!cancelled) setHealth({ status: "unreachable" });
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const status = health?.status ?? "loading";
  const map: Record<string, { color: string; label: string }> = {
    loading: { color: "var(--muted)", label: "Vérification du moteur…" },
    ok: { color: "var(--success)", label: "Moteur connecté" },
    degraded: { color: "var(--warning)", label: "Moteur dégradé (CNN absent)" },
    unreachable: { color: "var(--danger)", label: "Moteur injoignable" },
  };
  const s = map[status] ?? map.loading;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
        />
        {s.label}
      </span>
      {health?.status === "ok" || health?.status === "degraded" ? (
        <>
          <span>
            Fusion&nbsp;: <span className="font-mono">{health.fusion_mode}</span>
          </span>
          {health.model?.version ? (
            <span>
              Modèle&nbsp;: <span className="font-mono">v{health.model.version}</span>
            </span>
          ) : null}
          {health.calibration_version ? (
            <span>
              Calibration&nbsp;: <span className="font-mono">{health.calibration_version}</span>
            </span>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
