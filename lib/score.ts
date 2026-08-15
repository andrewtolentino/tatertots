/** Ratings needed before an item is considered ranked. Two of a crew of three. */
export const RANKED_THRESHOLD = 2;

/** The paper scorecard's scale: five tots, half steps allowed. */
export const MIN_SCORE = 1;
export const MAX_SCORE = 5;
export const SCORE_STEP = 0.5;

/**
 * Pin colour by score, on the 1-5 tot scale. The rest of the interface is
 * deliberately neutral, so this ramp is the only real colour on screen and
 * reads as a scale: warm gold for the good ones, cooling to grey as scores
 * drop. Grey also means nobody has rated it yet — a real state worth showing,
 * since the unrated pins are the tour's to-do list.
 */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "#a8a29e";
  if (score >= 4.5) return "#d97706";
  if (score >= 3.5) return "#f59e0b";
  if (score >= 2.5) return "#fbbf24";
  if (score >= 1.5) return "#a8a29e";
  return "#78716c";
}

export function formatScore(score: number | null | undefined): string {
  return score == null ? "–" : score.toFixed(1);
}
