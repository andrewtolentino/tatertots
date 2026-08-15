/**
 * The label shown against a rating.
 *
 * Ratings are world-readable, so display_name is public to anyone with the
 * link — which means anonymity has to live in the stored value, not in how it
 * is rendered. Trimming a real name down to an initial here would be theatre:
 * the full string stays one API call away. So the crew stores nicknames and
 * this renders them verbatim.
 *
 * See the handle_new_user trigger, which defaults new accounts to a neutral
 * placeholder rather than the email prefix for the same reason.
 */
export function raterLabel(displayName: string | null | undefined): string {
  return displayName?.trim() || "Anonymous";
}
