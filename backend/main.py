"""Point d'entrée du service backend sur Vercel (``entrypoint: main:app``).

Le moteur ``ai_detector`` (FFT + bruit résiduel + CNN ONNX) n'est pas dupliqué
ici : il est installé depuis le dépôt clickyX au moment du build, via la
dépendance git déclarée dans ``requirements.txt``. Ce fichier se contente de
l'adapter aux contraintes de l'exécution sans serveur :

* les artefacts du modèle (dont le poids ONNX de 16 Mo) sont récupérés au
  premier démarrage et mis en cache dans ``/tmp`` ;
* ``GET /model-info`` sert la fiche du modèle et le rapport de calibration
  produits pendant l'entraînement Colab ;
* ``POST /detect-image`` accepte les octets bruts d'une image, ce qui évite
  l'inflation de 33 % du base64 face au plafond de 4,5 Mo par requête ;
* le préfixe public ``/svc/api`` est retiré avant le routage, si bien que le
  service répond aussi bien derrière la rewrite Vercel qu'en local sur ``/``.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import tempfile
import urllib.request
from pathlib import Path
from typing import Any

LOGGER = logging.getLogger("clickyx.backend")

BACKEND_DIR = Path(__file__).resolve().parent
BUNDLED_MODEL_DIR = BACKEND_DIR / "model"

PUBLIC_PREFIX = "/svc/api"

# Les artefacts d'entraînement restent hébergés dans le dépôt du moteur : le
# poids ONNX est trop volumineux pour être versionné avec le site.
MODEL_BASE_URL = os.environ.get(
    "AI_DETECTOR_MODEL_BASE_URL",
    "https://raw.githubusercontent.com/alexandregbedo5-source/clickyX/master/model",
).rstrip("/")
DOWNLOAD_TIMEOUT = float(os.environ.get("AI_DETECTOR_MODEL_TIMEOUT", "30"))

# Taille plancher par artefact : en dessous, le téléchargement a ramené une page
# d'erreur plutôt que le fichier attendu.
MODEL_ASSETS: dict[str, int] = {
    "detector.onnx": 1_000_000,
    "calibration.json": 200,
    "calibration_report.json": 200,
    "model_card.json": 200,
}


def _cache_dir() -> Path:
    override = os.environ.get("AI_DETECTOR_CACHE_DIR")
    return Path(override) if override else Path(tempfile.gettempdir()) / "clickyx-model"


def _fetch(name: str, destination: Path, min_bytes: int) -> bool:
    target = destination / name
    if target.is_file() and target.stat().st_size >= min_bytes:
        return True

    tmp = target.with_suffix(target.suffix + ".part")
    try:
        with urllib.request.urlopen(f"{MODEL_BASE_URL}/{name}", timeout=DOWNLOAD_TIMEOUT) as response:
            with tmp.open("wb") as handle:
                shutil.copyfileobj(response, handle)
    except Exception as exc:  # noqa: BLE001 — un artefact manquant dégrade sans casser le service
        LOGGER.warning("Artefact %s non récupéré : %s", name, exc)
        tmp.unlink(missing_ok=True)
        return False

    if tmp.stat().st_size < min_bytes:
        LOGGER.warning("Artefact %s trop petit (%d octets) : ignoré.", name, tmp.stat().st_size)
        tmp.unlink(missing_ok=True)
        return False

    tmp.replace(target)
    return True


def _resolve_model_dir() -> Path:
    """Dossier des artefacts : embarqué s'il est complet, sinon cache téléchargé."""
    if all((BUNDLED_MODEL_DIR / name).is_file() for name in MODEL_ASSETS):
        return BUNDLED_MODEL_DIR

    cache = _cache_dir()
    cache.mkdir(parents=True, exist_ok=True)
    for name, min_bytes in MODEL_ASSETS.items():
        _fetch(name, cache, min_bytes)
    return cache


MODEL_DIR = _resolve_model_dir()

# Doit précéder la première construction du détecteur, qui lit ces variables.
os.environ.setdefault("AI_DETECTOR_MODEL_DIR", str(MODEL_DIR))
if (MODEL_DIR / "detector.onnx").is_file():
    os.environ.setdefault("AI_DETECTOR_MODEL_PATH", str(MODEL_DIR / "detector.onnx"))
if (MODEL_DIR / "calibration.json").is_file():
    os.environ.setdefault("AI_DETECTOR_CALIBRATION_PATH", str(MODEL_DIR / "calibration.json"))

from fastapi import HTTPException, Request  # noqa: E402

from ai_detector.preprocessing import ImageLoadError  # noqa: E402
from ai_detector.server import app, get_detector  # noqa: E402

# Plafond runtime Vercel : 4,5 Mo de corps de requête. On refuse un peu avant
# pour renvoyer une erreur lisible plutôt qu'une coupure de la plateforme.
MAX_UPLOAD_BYTES = 4 * 1024 * 1024


class StripPublicPrefix:
    """Retire ``/svc/api`` du chemin ASGI avant que Starlette ne route la requête.

    Vercel transmet au service l'URL publique complète : sans cela, le moteur
    répondrait 404 sur toutes ses routes en production tout en fonctionnant en local.
    """

    def __init__(self, app: Any, prefix: str) -> None:
        self.app = app
        self.prefix = prefix.rstrip("/")

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope.get("type") in ("http", "websocket"):
            path = scope.get("path", "")
            if path == self.prefix or path.startswith(self.prefix + "/"):
                scope = dict(scope)
                scope["path"] = path[len(self.prefix):] or "/"
                scope.pop("raw_path", None)
        await self.app(scope, receive, send)


app.add_middleware(StripPublicPrefix, prefix=PUBLIC_PREFIX)


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


@app.post("/detect-image", tags=["detection"])
async def detect_image(request: Request) -> Any:
    """Analyse une image envoyée en octets bruts (``Content-Type`` du fichier)."""
    raw = await request.body()
    if not raw:
        raise HTTPException(status_code=400, detail={"code": "empty_body", "message": "Aucune image reçue."})
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "image_too_large", "message": "Image trop volumineuse : 4 Mo maximum."},
        )
    try:
        result = get_detector().detect_bytes(raw, include_details=False)
    except ImageLoadError as exc:
        raise HTTPException(status_code=415, detail={"code": "unsupported_image", "message": str(exc)}) from exc
    return result.model_dump(exclude_none=True)
