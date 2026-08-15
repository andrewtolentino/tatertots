"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Item, ItemScore, Place } from "./database.types";

export type ItemWithScore = Item & {
  avg_score: number | null;
  rating_count: number;
};

export type PlaceWithItems = Place & {
  items: ItemWithScore[];
  /** Best average across this place's items — what the pin colour reflects. */
  top_score: number | null;
};

export function usePlaces() {
  const [places, setPlaces] = useState<PlaceWithItems[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // item_scores is a view with no foreign key, so PostgREST won't embed it
    // in the places query. Two round trips and a client-side join is simpler
    // than adding a synthetic relationship, and the dataset is tiny.
    const [placesResult, scoresResult] = await Promise.all([
      supabase.from("places").select("*, items(*)").order("name"),
      supabase.from("item_scores").select("*"),
    ]);

    if (placesResult.error || scoresResult.error) {
      setError(
        placesResult.error?.message ??
          scoresResult.error?.message ??
          "Failed to load places",
      );
      return;
    }

    const scoreByItem = new Map<string, ItemScore>(
      (scoresResult.data ?? []).map((s) => [s.item_id, s]),
    );

    const merged = ((placesResult.data ?? []) as (Place & { items: Item[] })[]).map(
      (place) => {
        const items: ItemWithScore[] = (place.items ?? []).map((item) => ({
          ...item,
          avg_score: scoreByItem.get(item.id)?.avg_score ?? null,
          rating_count: scoreByItem.get(item.id)?.rating_count ?? 0,
        }));

        const scored = items
          .map((i) => i.avg_score)
          .filter((s): s is number => s != null);

        return {
          ...place,
          items,
          top_score: scored.length ? Math.max(...scored) : null,
        };
      },
    );

    setError(null);
    setPlaces(merged);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { places, error, loading: places === null && error === null, reload: load };
}
