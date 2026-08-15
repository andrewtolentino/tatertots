/**
 * Ratings are publicly readable, so the map shows whatever is in display_name
 * to anyone with the link. First name only keeps the crew recognisable to each
 * other without publishing full names to strangers.
 *
 * Note this only shortens what is already stored — it is presentation, not
 * privacy. A display_name of "andrewjtolentino" has no space to split on and
 * comes back unchanged, so the underlying value still needs to be a real name.
 */
export function firstName(displayName: string | null | undefined): string {
  const trimmed = displayName?.trim();
  if (!trimmed) return "Someone";
  return trimmed.split(/\s+/)[0];
}
