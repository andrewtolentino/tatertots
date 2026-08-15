"use client";

import type { PlaceWithItems } from "@/lib/usePlaces";
import { REGION_LABELS, type Region } from "@/lib/database.types";
import { formatScore, scoreColor } from "@/lib/score";

// The tour's own order: San Francisco first, then east, then everywhere else.
const REGION_ORDER: Region[] = [
  "sf",
  "east_bay",
  "peninsula",
  "south_bay",
  "north_bay",
];

/** Rated places first, best down to worst; unrated fall to the bottom A–Z. */
function byScoreThenName(a: PlaceWithItems, b: PlaceWithItems) {
  if (a.top_score != null && b.top_score != null) {
    return b.top_score - a.top_score || a.name.localeCompare(b.name);
  }
  if (a.top_score != null) return -1;
  if (b.top_score != null) return 1;
  return a.name.localeCompare(b.name);
}

export function PlaceList({
  places,
  selectedId,
  onSelect,
}: {
  places: PlaceWithItems[];
  selectedId: string | null;
  onSelect: (place: PlaceWithItems) => void;
}) {
  const groups = REGION_ORDER.map((region) => ({
    region,
    places: places.filter((p) => p.region === region).sort(byScoreThenName),
  })).filter((group) => group.places.length > 0);

  return (
    <div className="flex flex-col gap-5 p-3">
      {groups.map(({ region, places: regionPlaces }) => (
        <section key={region}>
          <h2 className="px-2 pb-2 text-xs font-medium tracking-wide text-muted uppercase">
            {REGION_LABELS[region]}
            <span className="ml-1.5 normal-case">({regionPlaces.length})</span>
          </h2>

          <ul className="flex flex-col gap-1">
            {regionPlaces.map((place) => {
              const selected = place.id === selectedId;
              return (
                <li key={place.id}>
                  <button
                    onClick={() => onSelect(place)}
                    aria-current={selected ? "true" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                      selected
                        ? "bg-accent/15 ring-1 ring-accent/40"
                        : "hover:bg-border/50"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                      style={{ backgroundColor: scoreColor(place.top_score) }}
                    >
                      {place.top_score == null ? "🥔" : formatScore(place.top_score)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {place.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {place.neighborhood ?? place.city}
                        {place.status === "wishlist" && " · wishlist"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
