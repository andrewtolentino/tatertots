"use client";

import { useState } from "react";
import { supabase, isPermissionDenied } from "@/lib/supabase";
import { prepareImage } from "@/lib/image";
import { scoreColor } from "@/lib/score";
import { SERVICE_MODE_LABELS, type ServiceMode } from "@/lib/database.types";
import type { ItemWithScore } from "@/lib/usePlaces";

const DETAIL_AXES = ["crispiness", "taste", "color"] as const;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RateForm({
  item,
  userId,
  onSaved,
  onCancel,
}: {
  item: ItemWithScore;
  userId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [score, setScore] = useState(7);
  const [notes, setNotes] = useState("");
  const [visitedOn, setVisitedOn] = useState(today());
  const [file, setFile] = useState<File | null>(null);
  const [serviceMode, setServiceMode] = useState<ServiceMode>("dine_in");
  // The axes are part of every review now, so they start at a midpoint and are
  // always saved. The number beside each slider shows exactly what will be
  // recorded, so an untouched 5 is visible rather than silent.
  const [detail, setDetail] = useState<Record<string, number>>(
    Object.fromEntries(DETAIL_AXES.map((axis) => [axis, 5])),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    let photoPath: string | null = null;

    if (file) {
      const prepared = await prepareImage(file);
      const path = `${userId}/${item.id}-${Date.now()}.${prepared.ext}`;
      const upload = await supabase.storage
        .from("tot-photos")
        .upload(path, prepared.blob, { contentType: prepared.contentType });

      if (upload.error) {
        setSaving(false);
        setError(`Photo upload failed: ${upload.error.message}`);
        return;
      }
      photoPath = path;
    }

    // Upsert rather than insert: the unique key is (item, person, visit date),
    // so re-rating the same visit corrects it instead of erroring.
    const { error: saveError } = await supabase.from("ratings").upsert(
      {
        item_id: item.id,
        user_id: userId,
        score,
        notes: notes.trim() || null,
        photo_path: photoPath,
        visited_on: visitedOn,
        detail,
        service_mode: serviceMode,
      },
      { onConflict: "item_id,user_id,visited_on" },
    );

    setSaving(false);

    if (saveError) {
      setError(
        isPermissionDenied(saveError)
          ? "Your account is not on the crew list, so it cannot post ratings."
          : saveError.message,
      );
      return;
    }
    onSaved();
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-col gap-4 rounded-lg border border-border p-3"
    >
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="score" className="text-xs font-medium">
            Overall score
          </label>
          <span
            className="text-2xl font-semibold tabular-nums"
            style={{ color: scoreColor(score) }}
          >
            {score.toFixed(1)}
          </span>
        </div>
        <input
          id="score"
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="mt-1 w-full accent-amber-500"
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {DETAIL_AXES.map((axis) => (
          <div key={axis} className="flex items-center gap-3">
            <label htmlFor={axis} className="w-20 text-xs capitalize">
              {axis}
            </label>
            <input
              id={axis}
              type="range"
              min={1}
              max={10}
              step={1}
              value={detail[axis]}
              onChange={(e) =>
                setDetail((d) => ({ ...d, [axis]: Number(e.target.value) }))
              }
              className="flex-1 accent-amber-500"
            />
            <span className="w-4 text-right text-xs tabular-nums text-muted">
              {detail[axis]}
            </span>
          </div>
        ))}
      </div>

      {/* Takeout tots steam in the box on the way home, so this is context for
          reading the score rather than an afterthought. */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium">Served</span>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(Object.keys(SERVICE_MODE_LABELS) as ServiceMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={serviceMode === mode}
              onClick={() => setServiceMode(mode)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                serviceMode === mode
                  ? "bg-foreground text-background"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              }`}
            >
              {SERVICE_MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-xs font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Crispy shell, hollow inside…"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="visited" className="text-xs font-medium">
            Visited
          </label>
          <input
            id="visited"
            type="date"
            value={visitedOn}
            max={today()}
            onChange={(e) => setVisitedOn(e.target.value)}
            className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-xs font-medium">Photo</span>
          {/* The native file input renders its own button at its own height, so
              it never lines up with the date field beside it. Hide it and drive
              it from a label styled to match. */}
          <label
            htmlFor="photo"
            className="flex h-9 w-full cursor-pointer items-center truncate rounded-lg border border-border bg-background px-3 text-sm text-muted hover:border-foreground"
          >
            <span className="truncate">{file ? file.name : "Choose photo"}</span>
          </label>
          <input
            id="photo"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </div>
      </div>

      {error && <p className="text-xs text-accent">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save rating"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
