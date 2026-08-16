"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { PlaceWithItems } from "@/lib/usePlaces";

/**
 * "This place doesn't actually have tots." A static list goes stale — menus
 * change and a place can land here that never really had them — and the crew
 * cannot re-check twenty-odd menus on their own.
 *
 * Deliberately not a rating: it says nothing about quality, it questions
 * whether the pin belongs at all, so it goes to the review queue rather than
 * touching scores.
 */
export function ReportNoTots({ place }: { place: PlaceWithItems }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const { error: insertError } = await supabase.from("suggestions").insert({
      kind: "no_tots",
      place_id: place.id,
      // The table requires a name, and carrying the place's own name keeps the
      // queue readable without a join.
      name: place.name,
      city: place.city,
      address: place.address,
      note: note.trim() || null,
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="mt-4 rounded-lg border border-border px-3 py-2 text-xs text-muted">
        Thanks — we&rsquo;ll check the menu.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-xs text-muted underline underline-offset-2 hover:text-foreground"
      >
        No tots on the menu? Let us know
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 flex flex-col gap-2 rounded-lg border border-border p-3"
    >
      <label htmlFor={`report-${place.id}`} className="text-xs font-medium">
        No tots at {place.name}?
      </label>
      <textarea
        id={`report-${place.id}`}
        rows={2}
        maxLength={1000}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Off the menu since spring, staff said they stopped…"
        className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
      />
      {error && <p className="text-xs text-accent">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-8 flex-1 rounded-lg bg-foreground px-3 text-xs font-medium text-background disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-8 rounded-lg px-3 text-xs text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
