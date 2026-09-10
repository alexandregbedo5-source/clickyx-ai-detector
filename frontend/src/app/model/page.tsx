"use client";

import { useCallback, useEffect, useState } from "react";
import { ColabPipeline } from "@/components/colab-pipeline";
import { MetricCard } from "@/components/metric-card";
import { fetchModelData } from "@/lib/model-data";
import type { ModelData } from "@/lib/model-types";

function pct(v: number | undefined): string {
  return v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;
}

function auc(v: number | undefined): string {
  return v === undefined ? "—" : v.toFixed(3);
}

export default function ModelPage() {
  const [data, setData] = useState<ModelData | null>(null);
  const [error, setError] = useState<string>("");

  const load = useCallback(async () => {
    setError("");
    setData(null);
    try {
      setData(await fetchModelData());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Le moteur est injoignable.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <ModelError message={error} onRetry={load} />;
  if (!data) return <ModelSkeleton />;

  const card = data.card;
  const calib = data.calibration;
  const val = (card?.training?.val_metrics ?? {}) as Record<string, number>;
  const fusionFull = (calib?.fusion_full_oof ?? {}) as Record<string, number>;
  const fusionHc = (calib?.fusion_handcrafted_oof ?? {}) as Record<string, number>;

  if (!card) {
    return (
      <ModelError
        message="Le moteur a répondu, mais la fiche du modèle (model_card.json) est absente de son dossier model/."
        onRetry={load}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Modèle entraîné v{card.version} · {card.arch}
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Modèle &amp; entraînement
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Le détecteur repose sur un {card.arch} entraîné sur Google Colab, exporté en ONNX,
          puis fusionné avec deux analyses forensiques classiques via une régression logistique
          calibrée. Toutes les valeurs ci-dessous sont lues depuis les artefacts réels du dépôt.
        </p>
      </section>

      {/* Chiffres clés */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Performances</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="AUC validation (CNN)"
            value={auc(val.auc)}
            hint="Générateurs jamais vus à l'entraînement"
          />
          <MetricCard
            label="AUC fusion complète"
            value={auc(fusionFull.auc)}
            hint="FFT + bruit + CNN, hors-pli (K=5)"
            highlight
          />
          <MetricCard
            label="Exactitude équilibrée"
            value={pct(fusionFull.balanced_accuracy)}
            hint="Fusion complète, seuil 0,5"
          />
          <MetricCard
            label="Taux d'erreur égal (EER)"
            value={pct(fusionFull.eer)}
            hint="Plus bas = meilleur"
          />
        </div>
      </section>

      {/* Contribution des modules */}
      <section className="mb-12">
        <h2 className="mb-1 text-lg font-semibold">Apport de chaque détecteur</h2>
        <p className="mb-4 text-sm text-muted">
          AUC hors-pli mesurée sur la validation ({calib?.n ?? "—"} images ·{" "}
          {calib?.n_real ?? "—"} réelles / {calib?.n_ai ?? "—"} générées).
        </p>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Détecteur</th>
                <th className="px-4 py-3 font-medium">AUC</th>
                <th className="px-4 py-3 font-medium">Principe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              <tr>
                <td className="px-4 py-3 font-medium">Spectre fréquentiel (FFT)</td>
                <td className="px-4 py-3 font-mono">{auc(calib?.module_auc_oof.fft_score)}</td>
                <td className="px-4 py-3 text-muted">
                  Pics périodiques et résidu hautes fréquences du suréchantillonnage
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Bruit résiduel</td>
                <td className="px-4 py-3 font-mono">{auc(calib?.module_auc_oof.noise_score)}</td>
                <td className="px-4 py-3 text-muted">
                  Bruit de photon, matrice de Bayer (CFA), grille JPEG
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">CNN ({card.arch})</td>
                <td className="px-4 py-3 font-mono">{auc(calib?.cnn_auc)}</td>
                <td className="px-4 py-3 text-muted">
                  Réseau entraîné, crops à résolution native, moyenne des logits
                </td>
              </tr>
              <tr className="bg-primary/5">
                <td className="px-4 py-3 font-semibold">Fusion calibrée</td>
                <td className="px-4 py-3 font-mono font-semibold text-primary">
                  {auc(fusionFull.auc)}
                </td>
                <td className="px-4 py-3 text-muted">
                  Régression logistique sur les trois scores (mode <code>full</code>)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-muted">Fusion sans CNN (repli)</td>
                <td className="px-4 py-3 font-mono text-muted">{auc(fusionHc.auc)}</td>
                <td className="px-4 py-3 text-muted">
                  Mode <code>handcrafted</code> si le modèle ONNX est absent
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Pipeline Colab */}
      <section className="mb-12">
        <h2 className="mb-1 text-lg font-semibold">Pipeline d&apos;entraînement (Google Colab)</h2>
        <p className="mb-4 text-sm text-muted">
          Le notebook{" "}
          <code className="font-mono text-foreground">
            training/colab/ai_detector_colab.ipynb
          </code>{" "}
          reproduit l&apos;intégralité de la chaîne, du téléchargement des données au modèle servi
          par cette page.
        </p>
        <ColabPipeline />
      </section>

      {/* Détails techniques */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="mb-4 font-semibold">Fiche du modèle</h3>
          <dl className="space-y-2.5 text-sm">
            <Row k="Architecture" v={card.arch} />
            <Row k="Paramètres" v={`${(card.parameters / 1e6).toFixed(2)} M`} />
            <Row k="Version" v={`v${card.version}`} />
            <Row k="Taille du fichier" v={`${(card.size_bytes / 1e6).toFixed(1)} Mo`} />
            <Row k="Opset ONNX" v={String(card.opset)} />
            <Row k="Entrée" v={`image[${card.input?.shape?.join(", ")}]`} mono />
            <Row k="Sortie" v={card.output?.semantics ?? "—"} mono />
            <Row
              k="Exporté le"
              v={new Date(card.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
            <Row k="SHA-256" v={`${card.sha256.slice(0, 16)}…`} mono />
          </dl>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6">
          <h3 className="mb-4 font-semibold">Hyperparamètres d&apos;entraînement</h3>
          <dl className="space-y-2.5 text-sm">
            <Row k="Jeu de données" v={card.training?.data ?? "—"} />
            <Row k="Époques" v={`${card.training?.config?.epochs ?? "—"} (meilleure : ${card.training?.epoch ?? "—"})`} />
            <Row k="Taille de lot" v={String(card.training?.config?.batch_size ?? "—")} />
            <Row k="Taux d'apprentissage" v={String(card.training?.config?.lr ?? "—")} mono />
            <Row k="Weight decay" v={String(card.training?.config?.weight_decay ?? "—")} mono />
            <Row k="EMA" v={String(card.training?.config?.ema ?? "—")} mono />
            <Row
              k="Augmentations"
              v={`JPEG ${card.training?.config?.jpeg_p ?? "—"} · rescale ${card.training?.config?.rescale_p ?? "—"} · flou ${card.training?.config?.blur_p ?? "—"}`}
            />
            <Row k="Précision mixte (AMP)" v={card.training?.config?.amp ? "activée" : "désactivée"} />
            <Row k="Graine aléatoire" v={String(card.training?.config?.seed ?? "—")} mono />
          </dl>
        </div>
      </section>

      {/* Générateurs */}
      {calib?.generators ? (
        <section className="mt-12">
          <h2 className="mb-1 text-lg font-semibold">Sources du jeu de validation</h2>
          <p className="mb-4 text-sm text-muted">
            Répartition des images utilisées pour calibrer la fusion.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(calib.generators)
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => {
                const isReal = name.startsWith("real:");
                return (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
                    style={{
                      borderColor: isReal ? "var(--success)" : "var(--border)",
                      background: isReal ? "var(--success-soft)" : "var(--surface)",
                    }}
                  >
                    <span className="font-mono">{name.replace("real:", "")}</span>
                    <span className="text-muted">{count}</span>
                  </span>
                );
              })}
          </div>
          <p className="mt-3 text-xs text-muted">
            Bordure verte = images réelles · gris = générateurs IA
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ModelSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="skeleton h-6 w-56 rounded-full" />
      <div className="skeleton mt-4 h-10 w-80 rounded-lg" />
      <div className="skeleton mt-3 h-4 w-full max-w-2xl rounded-full" />
      <div className="skeleton mt-2 h-4 w-2/3 max-w-xl rounded-full" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28 rounded-xl" />
        ))}
      </div>
      <div className="skeleton mt-12 h-64 rounded-xl" />
      <p className="mt-6 text-center text-sm text-muted">
        Chargement des métriques d&apos;entraînement… Le premier appel réveille le moteur, cela
        peut prendre quelques secondes.
      </p>
    </div>
  );
}

function ModelError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Métriques indisponibles</h1>
      <p className="mx-auto mt-3 max-w-md text-muted">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-strong)]"
      >
        Réessayer
      </button>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/50 pb-2 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}
