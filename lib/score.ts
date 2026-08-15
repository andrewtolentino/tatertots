/** Ratings needed before an item is considered ranked. Two of a crew of three. */
export const RANKED_THRESHOLD = 2;

/**
 * Scores run 1-10 in whole numbers. The paper card used five tots; ten buckets
 * spread the list out without asking anyone to agonise over half a point at a
 * bar table.
 */
export const MIN_SCORE = 1;
export const MAX_SCORE = 10;
export const SCORE_STEP = 1;

/** Neutral starting point for a fresh rating, on the 1-10 scale. */
export const MID_SCORE = 5;

/**
 * Pin colour by score. The rest of the interface is deliberately neutral, so
 * this ramp is the only real colour on screen and reads as a scale: warm gold
 * for the good ones, cooling to grey as scores drop. Grey also means nobody has
 * rated it yet — a real state worth showing, since the unrated pins are the
 * tour's to-do list.
 */
export function scoreColor(score: number | null | undefined): string {
  if (score == null) return "#a8a29e";
  if (score >= 9) return "#d97706";
  if (score >= 7.5) return "#f59e0b";
  if (score >= 6) return "#fbbf24";
  if (score >= 4) return "#a8a29e";
  return "#78716c";
}

/**
 * Ratings are whole numbers, so an "8.0" would be noise — but averages across
 * the crew genuinely land on halves, and those decimals matter.
 */
export function formatScore(score: number | null | undefined): string {
  if (score == null) return "–";
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}
