"use client";

import type { PlaceWithItems } from "@/lib/usePlaces";
import { POTATO_LABELS } from "@/lib/database.types";
import { RANKED_THRESHOLD, formatScore, scoreColor } from "@/lib/score";

export function PlacePanel({
  place,
  onClose,
}: {
  place: PlaceWithItems;
  onClose: () => void;
}) {
  const mapsQuery = encodeURIComponent(
    [place.name, place.address, place.city].filter(Boolean).join(", "),
  );

  return (
    <aside
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 max-h-[70svh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:w-96 sm:max-h-none sm:rounded-none sm:rounded-l-2xl sm:border-t-0 sm:border-l"
      aria-label={`Details for ${place.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{place.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {[place.neighborhood, place.city].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 shrink-0 rounded-md p-2 text-muted hover:bg-background hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {place.status === "wishlist" && (
        <p className="mt-4 rounded-lg border border-border px-3 py-2 text-xs text-muted">
          On the wishlist — nobody has rated this yet.
        </p>
      )}

      <ul className="mt-5 flex flex-col gap-3">
        {place.items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-xs text-muted">
                {[
                  // The seed names every item after its own type, so printing
                  // both just repeats the word back at you.
                  item.name.trim().toLowerCase() ===
                  POTATO_LABELS[item.potato_type].toLowerCase()
                    ? null
                    : POTATO_LABELS[item.potato_type],
                  item.rating_count === 0
                    ? "Not yet rated"
                    : `${item.rating_count} rating${item.rating_count === 1 ? "" : "s"}`,
                  item.rating_count > 0 && item.rating_count < RANKED_THRESHOLD
                    ? "needs another opinion"
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span
              className="shrink-0 text-2xl font-semibold tabular-nums"
              style={{ color: scoreColor(item.avg_score) }}
            >
              {formatScore(item.avg_score)}
            </span>
          </li>
        ))}
        {place.items.length === 0 && (
          <li className="text-sm text-muted">No items listed yet.</li>
        )}
      </ul>

      <div className="mt-5 flex flex-col gap-2 text-sm">
        {place.address && <p className="text-muted">{place.address}</p>}
        <a
          className="text-accent hover:underline"
          href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          Open in Google Maps →
        </a>
        {place.website && (
          <a
            className="text-accent hover:underline"
            href={place.website}
            target="_blank"
            rel="noreferrer noopener"
          >
            Website →
          </a>
        )}
      </div>
    </aside>
  );
}
