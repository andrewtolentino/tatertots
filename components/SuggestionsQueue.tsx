"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { geocode } from "@/lib/geocode";
import { slugify } from "@/lib/slug";
import { useSuggestions } from "@/lib/useSuggestions";
import {
  REGION_LABELS,
  type PotatoType,
  type Region,
  type Suggestion,
} from "@/lib/database.types";

const FIELD =
  "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground";

/** Approving needs coordinates, which a suggestion never carries. */
function ApproveForm({
  suggestion,
  onDone,
  onCancel,
}: {
  suggestion: Suggestion;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(suggestion.name);
  const [address, setAddress] = useState(suggestion.address ?? "");
  const [city, setCity] = useState(suggestion.city ?? "");
  const [neighborhood, setNeighborhood] = useState("");
  const [region, setRegion] = useState<Region>("sf");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [looking, setLooking] = useState(false);
  const [lookupNote, setLookupNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookUp() {
    setLooking(true);
    setLookupNote(null);

    const query = [name, address, city].filter(Boolean).join(", ");
    const hit = await geocode(query);

    setLooking(false);

    if (!hit) {
      setLookupNote("No match. Right-click the spot in Google Maps and paste the coordinates.");
      return;
    }
    setLat(String(hit.lat));
    setLng(String(hit.lng));
    setLookupNote(hit.label);
  }

  async function approve() {
    setSaving(true);
    setError(null);

    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setSaving(false);
      setError("Coordinates are required — look them up or paste them in.");
      return;
    }

    // Wishlist, not visited: approving means it belongs on the map, not that
    // anyone has eaten there. The first rating flips it.
    const { data: place, error: placeError } = await supabase
      .from("places")
      .insert({
        slug: `${slugify(name)}-${Date.now().toString(36).slice(-4)}`,
        name: name.trim(),
        address: address.trim() || null,
        city: city.trim() || null,
        neighborhood: neighborhood.trim() || null,
        region,
        lat: latitude,
        lng: longitude,
        status: "wishlist",
      })
      .select("id")
      .single();

    if (placeError || !place) {
      setSaving(false);
      setError(placeError?.message ?? "Could not create the place.");
      return;
    }

    const { error: itemError } = await supabase.from("items").insert({
      place_id: place.id,
      potato_type: (suggestion.potato_type ?? "tater_tot") as PotatoType,
      name: "Tater Tots",
    });

    if (itemError) {
      setSaving(false);
      setError(`Place added, but its item failed: ${itemError.message}`);
      return;
    }

    await supabase
      .from("suggestions")
      .update({ status: "approved" })
      .eq("id", suggestion.id);

    setSaving(false);
    onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={FIELD} />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Address</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} className={FIELD} />
      </div>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">City</label>
          <input value={city} onChange={(e) => setCity(e.target.value)} className={FIELD} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">Neighborhood</label>
          <input
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className={FIELD}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium">Region</label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region)}
          className={FIELD}
        >
          {(Object.keys(REGION_LABELS) as Region[]).map((r) => (
            <option key={r} value={r}>
              {REGION_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">Latitude</label>
          <input value={lat} onChange={(e) => setLat(e.target.value)} className={FIELD} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium">Longitude</label>
          <input value={lng} onChange={(e) => setLng(e.target.value)} className={FIELD} />
        </div>
        <button
          type="button"
          onClick={lookUp}
          disabled={looking}
          className="h-9 shrink-0 rounded-lg border border-border px-3 text-xs font-medium hover:bg-surface-hover disabled:opacity-50"
        >
          {looking ? "…" : "Look up"}
        </button>
      </div>

      {lookupNote && <p className="text-xs text-muted">{lookupNote}</p>}
      {error && <p className="text-xs text-accent">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={approve}
          disabled={saving}
          className="h-9 flex-1 rounded-lg bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Adding…" : "Add to map"}
        </button>
        <button
          onClick={onCancel}
          className="h-9 rounded-lg px-3 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SuggestionsQueue({
  onClose,
  onApproved,
}: {
  onClose: () => void;
  onApproved: () => void;
}) {
  const { suggestions, reload } = useSuggestions(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function reject(id: string) {
    await supabase.from("suggestions").update({ status: "rejected" }).eq("id", id);
    reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Suggestions</h2>
          <p className="mt-1 text-sm text-muted">
            {suggestions === null
              ? "Loading…"
              : `${suggestions.length} waiting`}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mt-1 -mr-1 rounded-md p-2 text-muted hover:bg-surface-hover hover:text-foreground"
        >
          ✕
        </button>
      </div>

      {suggestions?.length === 0 && (
        <p className="rounded-lg border border-border px-3 py-6 text-center text-sm text-muted">
          Nothing pending.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {(suggestions ?? []).map((suggestion) => (
          <li key={suggestion.id} className="rounded-lg border border-border p-3">
            <p className="font-medium">{suggestion.name}</p>
            <p className="text-xs text-muted">
              {[suggestion.address, suggestion.city].filter(Boolean).join(" · ") ||
                "No address given"}
            </p>
            {suggestion.note && (
              <p className="mt-2 text-sm text-muted">{suggestion.note}</p>
            )}
            {suggestion.submitter_name && (
              <p className="mt-1 text-xs text-muted">
                — {suggestion.submitter_name}
              </p>
            )}

            {approvingId === suggestion.id ? (
              <ApproveForm
                suggestion={suggestion}
                onCancel={() => setApprovingId(null)}
                onDone={() => {
                  setApprovingId(null);
                  reload();
                  onApproved();
                }}
              />
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setApprovingId(suggestion.id)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-surface-hover"
                >
                  Add to map
                </button>
                <button
                  onClick={() => reject(suggestion.id)}
                  className="rounded-md px-2.5 py-1 text-xs text-muted hover:text-foreground"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
