/**
 * Met en forme une probabilité pour l'affichage.
 *
 * Un score très faible mais non nul s'arrondirait à « 0% », ce qui se lit comme
 * une absence de résultat plutôt que comme une quasi-certitude. On rend donc la
 * borne explicite aux deux extrémités.
 */
export function formatProbability(value: number): string {
  const p = Math.min(1, Math.max(0, value));
  if (p > 0 && p < 0.005) return "< 1%";
  if (p < 1 && p > 0.995) return "> 99%";
  return `${Math.round(p * 100)}%`;
}
