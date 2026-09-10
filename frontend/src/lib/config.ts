/**
 * URL du service de détection.
 *
 * - Sur Vercel : `BACKEND_URL` est injecté par le binding de service (vercel.json).
 * - En local   : `AI_DETECTOR_BASE_URL`, sinon le moteur lancé par
 *   `python -m ai_detector serve` sur 127.0.0.1:32188.
 */
export const DETECTOR_BASE_URL = (
  process.env.BACKEND_URL ??
  process.env.AI_DETECTOR_BASE_URL ??
  "http://127.0.0.1:32188"
).replace(/\/$/, "");

export const DETECTOR_TOKEN = process.env.AI_DETECTOR_TOKEN ?? "";

export const DETECTOR_TOKEN_HEADER = "x-ai-detector-token";

/**
 * Vercel plafonne le corps d'une requête à 4,5 Mo. L'image est envoyée en binaire
 * brut (pas en base64) pour ne pas perdre un tiers de ce budget.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
