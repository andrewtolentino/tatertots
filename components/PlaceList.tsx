"use client";

import { useMemo, useState } from "react";
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

type SortMode = "region" | "high" | "low";

const SORT_LABELS: Record<SortMode, string> = {
  region: "By region",
  high: "Highest rated",
  low: "Lowest rated",
};

/** Rated places first, best down to worst; unrated fall to the bottom A–Z. */
function byScoreThenName(a: PlaceWithItems, b: PlaceWithItems) {
  if (a.top_score != null && b.top_score != null) {
    return b.top_score - a.top_score || a.name.localeCompare(b.name);
  }
  if (a.top_score != null) return -1;
  if (b.top_score != null) return 1;
  return a.name.localeCompare(b.name);
}

function matches(place: PlaceWithItems, query: string): boolean {
  if (!query) return true;
  const haystack = [place.name, place.neighborhood, place.city]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function PlaceRow({
  place,
  selected,
  onSelect,
}: {
  place: PlaceWithItems;
  selected: boolean;
  onSelect: (place: PlaceWithItems) => void;
}) {
  return (
    <li>
      <button
        onClick={() => onSelect(place)}
        aria-current={selected ? "true" : undefined}
        className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
          selected ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-border/50"
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
          <span className="block truncate text-sm font-medium">{place.name}</span>
          <span className="block truncate text-xs text-muted">
            {place.neighborhood ?? place.city}
            {place.status === "wishlist" && " · wishlist"}
          </span>
        </span>
      </button>
    </li>
  );
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("region");

  const found = useMemo(
    () => places.filter((place) => matches(place, query)),
    [places, query],
  );

  // Sorting by score and grouping by region pull against each other — a single
  // ranked list is the point of "highest rated", so regions collapse away.
  const ranked = useMemo(() => {
    if (sort === "region") return [];
    const sorted = [...found].sort(byScoreThenName);
    // Unrated places have no position in a ranking either way, so they stay at
    // the bottom rather than pretending to be the worst.
    if (sort === "low") {
      const rated = sorted.filter((p) => p.top_score != null).reverse();
      const unrated = sorted.filter((p) => p.top_score == null);
      return [...rated, ...unrated];
    }
    return sorted;
  }, [found, sort]);

  const groups = useMemo(
    () =>
      REGION_ORDER.map((region) => ({
        region,
        places: found.filter((p) => p.region === region).sort(byScoreThenName),
      })).filter((group) => group.places.length > 0),
    [found],
  );

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 px-3 pt-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places…"
          aria-label="Search places by name"
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          aria-label="Sort places"
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-foreground"
        >
          {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {SORT_LABELS[mode]}
            </option>
          ))}
        </select>
        {query && (
          <p className="text-xs text-muted">
            {found.length} of {places.length}
          </p>
        )}
      </div>

      {found.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">
          Nothing matches “{query}”.
        </p>
      ) : sort === "region" ? (
        <div className="flex flex-col gap-5 p-3">
          {groups.map(({ region, places: regionPlaces }) => (
            <section key={region}>
              <h2 className="px-2 pb-2 text-xs font-medium tracking-wide text-muted uppercase">
                {REGION_LABELS[region]}
                <span className="ml-1.5 normal-case">
                  ({regionPlaces.length})
                </span>
              </h2>
              <ul className="flex flex-col gap-1">
                {regionPlaces.map((place) => (
                  <PlaceRow
                    key={place.id}
                    place={place}
                    selected={place.id === selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1 p-3">
          {ranked.map((place) => (
            <PlaceRow
              key={place.id}
              place={place}
              selected={place.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
