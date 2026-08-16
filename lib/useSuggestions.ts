"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Suggestion } from "./database.types";

/**
 * The pending queue. RLS restricts SELECT on suggestions to crew, so for anyone
 * else this simply comes back empty rather than erroring — the box is
 * write-only to the public by design.
 */
export function useSuggestions(enabled: boolean) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setSuggestions(null);
      return;
    }
    const { data, error } = await supabase
      .from("suggestions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setSuggestions(error ? [] : ((data ?? []) as Suggestion[]));
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { suggestions, reload: load };
}
