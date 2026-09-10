import { DETECTOR_BASE_URL, DETECTOR_TOKEN, DETECTOR_TOKEN_HEADER } from "@/lib/config";
import type { ModelData } from "@/lib/model-types";

/**
 * Récupère la fiche du modèle et le rapport de calibration auprès du backend.
 * Appelé côté serveur : le moteur reste privé, jamais exposé au navigateur.
 */
export async function fetchModelData(): Promise<ModelData> {
  const headers: Record<string, string> = {};
  if (DETECTOR_TOKEN) headers[DETECTOR_TOKEN_HEADER] = DETECTOR_TOKEN;

  try {
    const res = await fetch(`${DETECTOR_BASE_URL}/model-info`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { card: null, calibration: null };
    return (await res.json()) as ModelData;
  } catch {
    return { card: null, calibration: null };
  }
}
