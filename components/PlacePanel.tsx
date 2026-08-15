"use client";

import { useState } from "react";
import type { PlaceWithItems } from "@/lib/usePlaces";
import { POTATO_LABELS } from "@/lib/database.types";
import { RANKED_THRESHOLD, formatScore, scoreColor } from "@/lib/score";
import { publicPhotoUrl, useRatings } from "@/lib/useRatings";
import { useAuth } from "@/lib/useAuth";
import { RateForm } from "./RateForm";

export function PlacePanel({
  place,
  onClose,
  onRated,
}: {
  place: PlaceWithItems;
  onClose: () => void;
  onRated: () => void;
}) {
  const { user, isCrew } = useAuth();
  const { ratings, reload } = useRatings(place.id);
  const [ratingItemId, setRatingItemId] = useState<string | null>(null);

  const mapsQuery = encodeURIComponent(
    [place.name, place.address, place.city].filter(Boolean).join(", "),
  );

  return (
    <aside
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 max-h-[70svh] overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 shadow-xl sm:inset-y-4 sm:right-4 sm:left-auto sm:max-h-none sm:w-96 sm:rounded-2xl"
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
          className="-mt-1 -mr-1 shrink-0 rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground"
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
          <li key={item.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-4">
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
            </div>

            {isCrew && user && ratingItemId !== item.id && (
              <button
                onClick={() => setRatingItemId(item.id)}
                className="mt-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
              >
                Rate these
              </button>
            )}

            {isCrew && user && ratingItemId === item.id && (
              <RateForm
                item={item}
                userId={user.id}
                onCancel={() => setRatingItemId(null)}
                onSaved={() => {
                  setRatingItemId(null);
                  reload();
                  onRated();
                }}
              />
            )}
          </li>
        ))}
        {place.items.length === 0 && (
          <li className="text-sm text-muted">No items listed yet.</li>
        )}
      </ul>

      {ratings && ratings.length > 0 && (
        <section className="mt-5">
          <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
            Ratings
          </h3>
          <ul className="mt-2 flex flex-col gap-3">
            {ratings.map((rating) => (
              <li key={rating.id} className="flex gap-3">
                <span
                  className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: scoreColor(rating.score) }}
                >
                  {formatScore(rating.score)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {rating.profiles?.display_name ?? "Someone"}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {rating.visited_on}
                    </span>
                  </p>
                  {rating.detail && Object.keys(rating.detail).length > 0 && (
                    <ul className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(rating.detail).map(([axis, value]) => (
                        <li
                          key={axis}
                          className="rounded-md bg-surface-hover px-1.5 py-0.5 text-xs text-muted capitalize"
                        >
                          {axis} <span className="tabular-nums">{value}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {rating.notes && (
                    <p className="mt-1 text-sm text-muted">{rating.notes}</p>
                  )}
                  {rating.photo_path && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={publicPhotoUrl(rating.photo_path)}
                      alt={`Tots at ${place.name}`}
                      loading="lazy"
                      className="mt-2 w-full rounded-lg border border-border"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
