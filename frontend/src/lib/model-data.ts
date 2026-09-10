import { API_BASE } from "@/lib/config";
import type { ModelData } from "@/lib/model-types";

/**
 * Récupère la fiche du modèle et le rapport de calibration auprès du moteur.
 * Le premier appel après une mise en veille peut être lent : le service charge
 * alors le poids ONNX de 16 Mo.
 */
export async function fetchModelData(): Promise<ModelData> {
  const res = await fetch(`${API_BASE}/model-info`, {
    cache: "no-store",
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Le moteur a répondu ${res.status}.`);
  return (await res.json()) as ModelData;
}
