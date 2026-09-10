/**
 * Base d'appel du moteur de détection.
 *
 * En production le backend FastAPI est exposé par Vercel sur le même domaine que
 * le site, sous `/svc/api` (voir la rewrite dans `vercel.json`). Les appels sont
 * donc relatifs : pas de variable d'environnement à configurer, pas de CORS, et
 * aucun rebond inutile par une route Next.js.
 *
 * `NEXT_PUBLIC_API_BASE` ne sert qu'au développement local, quand le moteur
 * tourne sur un autre port que le site.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ?? "/svc/api").replace(/\/$/, "");

/** Plafond runtime Vercel : 4,5 Mo par requête. On garde une marge. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
