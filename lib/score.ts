/** Ratings needed before an item is considered ranked. Two of a crew of three. */
export const RANKED_THRESHOLD = 2;

/**
 * Pin colour by score. Grey means nobody has rated it yet, which is a real state
 * worth showing rather than hiding — the unrated pins are the tour's to-do list.
 */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "#8c7a63";
  if (score >= 9) return "#e0952a";
  if (score >= 7.5) return "#d6a441";
  if (score >= 6) return "#b8975a";
  if (score >= 4) return "#9c8467";
  return "#8a6f5c";
}

export function formatScore(score: number | null | undefined): string {
  return score == null ? "–" : score.toFixed(1);
}
