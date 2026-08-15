"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";

export type RatingWithWho = {
  id: string;
  item_id: string;
  user_id: string;
  score: number;
  notes: string | null;
  photo_path: string | null;
  visited_on: string;
  profiles: { display_name: string } | null;
};

export function publicPhotoUrl(path: string): string {
  return supabase.storage.from("tot-photos").getPublicUrl(path).data.publicUrl;
}

/** Every rating for one place, newest visit first. */
export function useRatings(placeId: string | null) {
  const [ratings, setRatings] = useState<RatingWithWho[] | null>(null);

  const load = useCallback(async () => {
    if (!placeId) {
      setRatings(null);
      return;
    }
    // !inner makes the items join a filter rather than a left join, so this
    // returns only ratings belonging to this place's items.
    const { data, error } = await supabase
      .from("ratings")
      .select("*, profiles(display_name), items!inner(place_id)")
      .eq("items.place_id", placeId)
      .order("visited_on", { ascending: false });

    setRatings(error ? [] : ((data ?? []) as unknown as RatingWithWho[]));
  }, [placeId]);

  useEffect(() => {
    setRatings(null);
    load();
  }, [load]);

  return { ratings, reload: load };
}
