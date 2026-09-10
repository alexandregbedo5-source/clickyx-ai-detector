"use client";

import { useCallback, useRef, useState } from "react";
import type { ApiError, DetectResponse } from "@/lib/types";
import { VerdictBadge } from "@/components/verdict-badge";
import { ScoreBar } from "@/components/score-bar";

const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];

type Status = "idle" | "ready" | "loading" | "done" | "error";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export function DetectorPanel() {
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<DetectResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStatus("idle");
    setPreview(null);
    setFile(null);
    setResult(null);
    setError("");
  };

  const selectFile = useCallback(async (picked: File) => {
    setError("");
    setResult(null);
    if (!ACCEPT.includes(picked.type)) {
      setError("Format non supporté. Utilisez JPEG, PNG, WebP, BMP ou TIFF.");
      setStatus("error");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError(
        `Image trop volumineuse (${(picked.size / 1e6).toFixed(1)} Mo). Maximum 4 Mo : l'analyse se fait à la résolution native, sans redimensionnement qui détruirait les indices forensiques.`,
      );
      setStatus("error");
      return;
    }
    setPreview(await fileToDataUrl(picked));
    setFile(picked);
    setStatus("ready");
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) selectFile(dropped);
    },
    [selectFile],
  );

  const analyze = useCallback(async () => {
    if (!file) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) {
        const apiErr = data as ApiError;
        setError(apiErr.error?.message ?? "Erreur inconnue du moteur.");
        setStatus("error");
        return;
      }
      setResult(data as DetectResponse);
      setStatus("done");
    } catch {
      setError("Impossible de contacter le service. Réessayez.");
      setStatus("error");
    }
  }, [file]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Zone d'upload */}
      <div className="flex flex-col gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`relative flex min-h-[320px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-border bg-surface hover:border-primary/60"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={file?.name || "aperçu"}
              className="max-h-[300px] w-auto rounded-lg object-contain"
            />
          ) : (
            <>
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-primary">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 16V4m0 0L8 8m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="font-medium">Glissez-déposez une image ici</p>
              <p className="mt-1 text-sm text-muted">
                ou cliquez pour parcourir · JPEG, PNG, WebP · 4 Mo max
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT.join(",")}
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) selectFile(picked);
              e.target.value = "";
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={analyze}
            disabled={status !== "ready" && status !== "done"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[color:var(--primary-strong)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "loading" ? "Analyse en cours…" : "Analyser l'image"}
          </button>
          {preview ? (
            <button
              onClick={reset}
              className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted transition-colors hover:text-foreground hover:bg-surface"
            >
              Réinitialiser
            </button>
          ) : null}
          {file ? (
            <span className="truncate text-xs text-muted" title={file.name}>
              {file.name} · {(file.size / 1e6).toFixed(1)} Mo
            </span>
          ) : null}
        </div>
      </div>

      {/* Zone de résultat */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        {status === "idle" || status === "ready" ? (
          <EmptyState ready={status === "ready"} />
        ) : null}
        {status === "loading" ? <LoadingState preview={preview} /> : null}
        {status === "error" ? <ErrorState message={error} /> : null}
        {status === "done" && result ? <ResultState result={result} /> : null}
      </div>
    </div>
  );
}

function EmptyState({ ready }: { ready: boolean }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 12h6m-3-3v6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-medium">
        {ready ? "Prêt à analyser" : "Aucune image sélectionnée"}
      </p>
      <p className="mt-1 max-w-xs text-sm text-muted">
        {ready
          ? "Cliquez sur « Analyser l'image » pour lancer la détection."
          : "Le verdict et les scores FFT / bruit / CNN s'afficheront ici."}
      </p>
    </div>
  );
}

function LoadingState({ preview }: { preview: string | null }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center">
      <div className="scanline relative h-40 w-40 overflow-hidden rounded-lg bg-surface-2">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="analyse" className="h-full w-full object-cover opacity-70" />
        ) : null}
      </div>
      <p className="mt-4 text-sm text-muted">Analyse forensique en cours…</p>
      <div className="mt-4 w-full max-w-xs space-y-2">
        <div className="skeleton h-2.5 rounded-full" />
        <div className="skeleton h-2.5 w-4/5 rounded-full" />
        <div className="skeleton h-2.5 w-3/5 rounded-full" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 8v5m0 3h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-medium">Analyse impossible</p>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
    </div>
  );
}

function ResultState({ result }: { result: DetectResponse }) {
  return (
    <div className="fade-up space-y-5">
      <VerdictBadge isAi={result.is_ai_generated} confidence={result.confidence} />

      <div className="space-y-4">
        <ScoreBar
          label="Spectre fréquentiel (FFT)"
          value={result.fft_score}
          description="Artefacts périodiques et anomalies hautes fréquences."
        />
        <ScoreBar
          label="Bruit résiduel du capteur"
          value={result.noise_score}
          description="Empreinte du bruit d'un vrai capteur photographique."
        />
        <ScoreBar
          label="Réseau de neurones (CNN)"
          value={result.cnn_score}
          description="EfficientNet-B0 entraîné sur images réelles vs générées."
        />
      </div>

      {result.warnings && result.warnings.length > 0 ? (
        <div
          className="rounded-lg border p-3 text-xs"
          style={{ borderColor: "var(--warning)", color: "var(--warning)" }}
        >
          <p className="mb-1 font-medium">Avertissements de fiabilité</p>
          <ul className="list-disc space-y-0.5 pl-4 font-mono">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-muted">
        Contrat v{result.contract_version}
        {result.model_version ? ` · modèle v${result.model_version}` : ""} · analyse locale
      </p>
    </div>
  );
}
