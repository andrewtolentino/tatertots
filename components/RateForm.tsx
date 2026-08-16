"use client";

import { useState } from "react";
import { supabase, isPermissionDenied } from "@/lib/supabase";
import { prepareImage } from "@/lib/image";
import {
  MAX_SCORE,
  MID_SCORE,
  MIN_SCORE,
  SCORE_STEP,
  formatScore,
  scoreColor,
} from "@/lib/score";
import {
  RATING_AXES,
  SERVICE_MODE_LABELS,
  TEXTURE_TAGS,
  type RatingAxis,
  type ServiceMode,
  type TextureTag,
} from "@/lib/database.types";
import type { ItemWithScore } from "@/lib/usePlaces";
import type { RatingWithWho } from "@/lib/useRatings";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RateForm({
  item,
  userId,
  existing,
  onSaved,
  onCancel,
}: {
  item: ItemWithScore;
  userId: string;
  /** Present when correcting a rating already saved, rather than adding one. */
  existing?: RatingWithWho | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  // Editing starts from what was actually saved. A blank form would mean
  // retyping the whole rating from memory, and anything forgotten would be
  // overwritten with nothing.
  const [score, setScore] = useState(existing?.score ?? MID_SCORE);
  const [axes, setAxes] = useState<Record<RatingAxis, number>>({
    presentation: existing?.presentation ?? MID_SCORE,
    flavor: existing?.flavor ?? MID_SCORE,
    creativity: existing?.creativity ?? MID_SCORE,
    value_rating: existing?.value_rating ?? MID_SCORE,
  });
  const [price, setPrice] = useState(existing?.price ?? 2);
  const [texture, setTexture] = useState<TextureTag[]>(existing?.texture ?? []);
  const [orderText, setOrderText] = useState(existing?.order_text ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  // Crucially the original visit date, not today: saving keys on it, so
  // defaulting to today would file a correction as a second, separate visit.
  const [visitedOn, setVisitedOn] = useState(existing?.visited_on ?? today());
  const [serviceMode, setServiceMode] = useState<ServiceMode>(
    existing?.service_mode ?? "dine_in",
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTexture(tag: TextureTag) {
    setTexture((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    // Keep the photo already attached unless a new one is chosen.
    let photoPath: string | null = existing?.photo_path ?? null;

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

    const payload = {
      item_id: item.id,
      user_id: userId,
      score,
      ...axes,
      price,
      // An empty array is a real answer ("no texture stood out"); null would
      // mean the question was never asked.
      texture,
      order_text: orderText.trim() || null,
      notes: notes.trim() || null,
      photo_path: photoPath,
      visited_on: visitedOn,
      service_mode: serviceMode,
    };

    // Editing targets the row by id so it stays one rating even if the visit
    // date is corrected. A new rating upserts on (item, person, visit date), so
    // re-rating the same visit fixes it rather than erroring.
    const { error: saveError } = existing
      ? await supabase.from("ratings").update(payload).eq("id", existing.id)
      : await supabase
          .from("ratings")
          .upsert(payload, { onConflict: "item_id,user_id,visited_on" });

    setSaving(false);

    if (saveError) {
      setError(
        isPermissionDenied(saveError)
          ? "Your account is not on the crew list, so it cannot post ratings."
          : saveError.code === "23505"
            ? "You already have a rating for this place on that date."
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
            {formatScore(score)}
          </span>
        </div>
        <input
          id="score"
          type="range"
          min={MIN_SCORE}
          max={MAX_SCORE}
          step={SCORE_STEP}
          value={score}
          onChange={(e) => setScore(Number(e.target.value))}
          className="mt-1 w-full accent-amber-500"
        />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {RATING_AXES.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <label htmlFor={key} className="w-24 shrink-0 text-xs">
              {label}
            </label>
            <input
              id={key}
              type="range"
              min={MIN_SCORE}
              max={MAX_SCORE}
              step={SCORE_STEP}
              value={axes[key]}
              onChange={(e) =>
                setAxes((a) => ({ ...a, [key]: Number(e.target.value) }))
              }
              className="flex-1 accent-amber-500"
            />
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted">
              {formatScore(axes[key])}
            </span>
          </div>
        ))}
      </div>

      {/* Multi-select, not a scale: a tot can be crispy and dry at once, and
          "mushy" and "dry" are different failures. */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium">Texture</span>
        <div className="flex flex-wrap gap-1.5">
          {TEXTURE_TAGS.map((tag) => {
            const on = texture.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTexture(tag)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition-colors ${
                  on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium">Price</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              aria-label={`${level} of 5`}
              aria-pressed={price === level}
              onClick={() => setPrice(level)}
              className={`h-8 flex-1 rounded-md border text-sm font-semibold transition-colors ${
                level <= price
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              $
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="order" className="text-xs font-medium">
          Order
        </label>
        <input
          id="order"
          type="text"
          value={orderText}
          onChange={(e) => setOrderText(e.target.value)}
          placeholder="Truffle parm tots, large"
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
        />
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
            <span className="truncate">
              {file
                ? file.name
                : existing?.photo_path
                  ? "Replace photo"
                  : "Choose photo"}
            </span>
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
          className="h-9 flex-1 rounded-lg bg-foreground px-3 text-sm font-medium text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : existing ? "Save changes" : "Save rating"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-lg px-3 text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
