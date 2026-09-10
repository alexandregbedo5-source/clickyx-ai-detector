const STEPS = [
  {
    n: "1–3",
    title: "Environnement & espace de travail",
    detail:
      "Détection du GPU (repli CPU automatique), clone du dépôt, dépendances d'entraînement, dossiers de données et de sorties.",
  },
  {
    n: "4a–4c",
    title: "Constitution du jeu de données",
    detail:
      "Community Forensics-Small (images réelles + 25 générateurs) et AIGenImages2026 (19 modèles 2024–2025, hors distribution). Manifestes train / val / test séparés par générateur.",
  },
  {
    n: "5",
    title: "Entraînement",
    detail:
      "EfficientNet-B0 pré-entraîné, échantillonnage équilibré, gel du backbone la 1ʳᵉ époque, augmentations JPEG / redimensionnement / flou, EMA et arrêt anticipé.",
  },
  {
    n: "5b–6",
    title: "Courbes & évaluation",
    detail:
      "Courbes d'apprentissage, puis évaluation du meilleur point de contrôle : AUC, EER, ECE, robustesse sous compression et redimensionnement.",
  },
  {
    n: "7",
    title: "Export ONNX + fiche du modèle",
    detail:
      "Conversion en ONNX (opset 17) avec vérification numérique torch ↔ onnxruntime, puis génération de model_card.json (métriques, SHA-256, hyperparamètres).",
  },
  {
    n: "8",
    title: "Calibration de la fusion",
    detail:
      "Régression logistique hors-pli (K=5) sur les scores FFT, bruit et CNN de la validation → calibration.json et calibration_report.json.",
  },
  {
    n: "9–10",
    title: "Vérification de bout en bout",
    detail:
      "Exécution du pipeline complet tel que servi par l'API, puis contrôle du contrat POST /detect-ai-image via la CLI et le serveur.",
  },
  {
    n: "11–12",
    title: "Sauvegarde des artefacts",
    detail:
      "Archivage du modèle, de la calibration et des rapports, puis versionnement dans le dépôt (Git normal, 16 Mo, LFS non requis).",
  },
];

export function ColabPipeline() {
  return (
    <ol className="relative space-y-4 border-l border-border pl-6">
      {STEPS.map((s) => (
        <li key={s.n} className="relative">
          <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[color:var(--background)] bg-primary" />
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-primary">
                bloc {s.n}
              </span>
              <h3 className="text-sm font-semibold">{s.title}</h3>
            </div>
            <p className="text-sm text-muted">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
