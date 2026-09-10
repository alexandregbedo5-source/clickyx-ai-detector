"""Point d'entrée du service backend sur Vercel (``entrypoint: main:app``).

Réutilise tel quel le moteur ``ai_detector`` (FFT + bruit résiduel + CNN ONNX) et
ajoute une route ``GET /model-info`` qui sert les artefacts d'entraînement produits
sur Colab, afin que le frontend puisse afficher les vraies métriques.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ai_detector.server import app

MODEL_DIR = Path(__file__).resolve().parent / "model"


def _read_json(name: str) -> Any | None:
    try:
        return json.loads((MODEL_DIR / name).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


@app.get("/model-info", tags=["service"])
async def model_info() -> dict[str, Any]:
    """Fiche du modèle et rapport de calibration issus de l'entraînement Colab."""
    return {
        "card": _read_json("model_card.json"),
        "calibration": _read_json("calibration_report.json"),
    }
