"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

const FIELD =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground";

export function SuggestForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [note, setNote] = useState("");
  // Honeypot: hidden from people, irresistible to naive bots. Anything that
  // fills it gets a success screen and no database row.
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    if (website.trim()) {
      setBusy(false);
      setSent(true);
      return;
    }

    const { error: insertError } = await supabase.from("suggestions").insert({
      name: name.trim(),
      address: address.trim() || null,
      city: city.trim() || null,
      submitter_name: submitterName.trim() || null,
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
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Thanks — got it</h2>
          <p className="mt-1 text-sm text-muted">
            We read every suggestion. If it makes the cut it&rsquo;ll show up on
            the map as a wishlist pin, and turn gold once we&rsquo;ve been.
          </p>
        </div>
        <button
          onClick={onClose}
          className="h-9 rounded-lg bg-foreground px-3 text-sm font-medium text-background"
        >
          Back to the map
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Suggest a spot</h2>
        <p className="mt-1 text-sm text-muted">
          Know somewhere with tots worth trying? Tell us and we&rsquo;ll add it
          to the list. Tater tots only for now — the rest of the potato family
          comes later.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-name" className="text-xs font-medium">
          Restaurant or bar <span className="text-muted">(required)</span>
        </label>
        <input
          id="s-name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Zeitgeist"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-city" className="text-xs font-medium">
          City or neighborhood
        </label>
        <input
          id="s-city"
          maxLength={80}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Mission, SF"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-address" className="text-xs font-medium">
          Address <span className="text-muted">(helps us find it)</span>
        </label>
        <input
          id="s-address"
          maxLength={200}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="199 Valencia St"
          className={FIELD}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-note" className="text-xs font-medium">
          Why should we go?
        </label>
        <textarea
          id="s-note"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ask for them extra crispy…"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="s-from" className="text-xs font-medium">
          Your name <span className="text-muted">(optional)</span>
        </label>
        <input
          id="s-from"
          maxLength={80}
          value={submitterName}
          onChange={(e) => setSubmitterName(e.target.value)}
          className={FIELD}
        />
      </div>

      <div aria-hidden className="hidden">
        <label htmlFor="s-website">Leave this empty</label>
        <input
          id="s-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="h-9 flex-1 rounded-lg bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send suggestion"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-lg px-3 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
