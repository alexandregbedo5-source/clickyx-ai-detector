import { DetectorStatus } from "@/components/detector-status";
import { DetectorPanel } from "@/components/detector-panel";

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Forensic numérique · FFT + bruit résiduel + CNN
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Cette image a-t-elle été générée par une IA&nbsp;?
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Déposez une image&nbsp;: ClickyX l&apos;analyse avec trois détecteurs indépendants —
          spectre fréquentiel, bruit résiduel du capteur et réseau de neurones entraîné — puis
          fusionne leurs verdicts en une estimation calibrée.
        </p>
        <div className="mt-4">
          <DetectorStatus />
        </div>
      </section>

      <DetectorPanel />
    </div>
  );
}
