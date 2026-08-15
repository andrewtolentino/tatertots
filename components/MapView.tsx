"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { usePlaces, type PlaceWithItems } from "@/lib/usePlaces";
import { formatScore, scoreColor } from "@/lib/score";
import { PlacePanel } from "./PlacePanel";
import { PlaceList } from "./PlaceList";
import { SignIn } from "./SignIn";

// Free, no API key, no signup, no billing account.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const SF = { lng: -122.4194, lat: 37.7749 };

// See scripts/copy-maplibre-worker.mjs — MapLibre cannot find its own worker
// once bundled, so we serve it and hand over an absolute URL. Absolute matters:
// MapLibre resolves this against `import.meta.url`, which is not a usable base
// after bundling.
const WORKER_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/maplibre/maplibre-gl-worker.mjs`;

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<PlaceWithItems | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const { places, error, loading, reload } = usePlaces();

  // Shared by the sidebar, the mobile sheet, and the pins themselves, so all
  // three routes to a place behave identically.
  const selectPlace = useCallback((place: PlaceWithItems) => {
    setSelected(place);
    setListOpen(false);

    const map = mapRef.current;
    if (!map) return;

    // The detail panel sits on top of the map, so centring on the canvas would
    // park the pin underneath it. Shift the camera by half the panel so the
    // selected place lands in the part still visible: sideways for the 24rem
    // side panel, upward for the bottom sheet on small screens.
    const sidePanel = window.matchMedia("(min-width: 40rem)").matches;
    const offset: [number, number] = sidePanel ? [-192, 0] : [0, -110];

    map.easeTo({
      center: [place.lng, place.lat],
      zoom: Math.max(map.getZoom(), 14),
      offset,
      duration: 600,
    });
  }, []);

  // MapLibre touches `window` on import, and a static export prerenders this
  // component to HTML at build time, so it can only be imported in the browser.
  useEffect(() => {
    let map: MapLibreMap | null = null;
    let cancelled = false;

    (async () => {
      // MapLibre 6 ships named exports only — there is no default export.
      const maplibregl = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;

      maplibregl.setWorkerUrl(new URL(WORKER_URL, window.location.origin).href);

      const instance = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [SF.lng, SF.lat],
        zoom: 12,
        attributionControl: { compact: true },
      });
      instance.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      instance.addControl(
        new maplibregl.GeolocateControl({ trackUserLocation: false }),
        "top-right",
      );

      map = instance;
      mapRef.current = instance;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !places?.length) return;

    let cancelled = false;

    (async () => {
      const maplibregl = await import("maplibre-gl");
      if (cancelled) return;

      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();

      for (const place of places) {
        // MapLibre positions this outer element with
        // `transform: translate(-50%,-50%) translate(xpx,ypx)`. Anything that
        // adds its own transform — including Tailwind's scale utilities, which
        // multiply the whole matrix — scales that pixel offset too and throws
        // the pin away from the cursor. So the outer element stays untouched
        // and every hover effect lives on the button inside it.
        const el = document.createElement("div");

        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-label", place.name);
        button.className =
          "flex size-9 cursor-pointer items-center justify-center rounded-full border-2 border-white text-xs font-semibold text-white shadow-md transition-[scale,box-shadow] hover:scale-110 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";
        button.style.backgroundColor = scoreColor(place.top_score);
        button.textContent =
          place.top_score == null ? "🥔" : formatScore(place.top_score);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          selectPlace(place);
        });

        el.appendChild(button);

        markersRef.current.push(
          new maplibregl.Marker({ element: el })
            .setLngLat([place.lng, place.lat])
            .addTo(map),
        );
        bounds.extend([place.lng, place.lat]);
      }

      if (!bounds.isEmpty()) {
        // The sidebar card floats over the map rather than displacing it, so
        // the initial fit has to reserve its width or the westernmost pins
        // start life hidden underneath it.
        const wide = window.matchMedia("(min-width: 64rem)").matches;
        map.fitBounds(bounds, {
          padding: wide
            ? { left: 368, top: 64, right: 64, bottom: 64 }
            : { left: 48, top: 120, right: 48, bottom: 110 },
          maxZoom: 14,
          duration: 0,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mapReady, places, selectPlace]);

  const count = places?.length ?? 0;
  const subtitle = loading
    ? "Loading…"
    : `${count} spot${count === 1 ? "" : "s"} on the map`;

  const title = (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <span aria-hidden className="text-3xl">
          🥔
        </span>
        Tater Tot Tour
      </h1>
      <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted">
        An interactive tour of tater tots around the Bay Area. We&rsquo;re just
        getting started, so your favourite might not be here yet. Every rating
        is our own — and strictly about the tots.
      </p>
    </div>
  );

  return (
    // h-dvh, not flex-1: `body` only has min-height, so its height is
    // indefinite, and a percentage height inside it resolves to auto — which is
    // 0 here because MapLibre positions its canvas absolutely. dvh also tracks
    // mobile browser chrome as it hides.
    <div className="relative h-dvh w-full overflow-hidden">
      <div className="relative h-full w-full">
        {/* h-full rather than absolute inset-0: maplibre-gl.css sets
            .maplibregl-map{position:relative} and loads after Tailwind's
            utilities, so an `absolute` here loses and the map collapses to 0px. */}
        <div ref={containerRef} className="h-full w-full" />

        {/* A floating card over a full-bleed map. The map extends underneath
            it, so fitBounds below pads by the card's width to keep pins from
            hiding behind it. Collapses under lg, where the card plus the detail
            panel would leave almost no map — the list moves to the sheet. */}
        <aside className="absolute top-4 bottom-4 left-4 z-10 hidden w-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl lg:flex">
          <div className="border-b border-border px-5 py-4">{title}</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {places && (
              <PlaceList
                places={places}
                selectedId={selected?.id ?? null}
                onSelect={selectPlace}
              />
            )}
          </div>
          <div className="border-t border-border px-4 py-3">
            <SignIn />
          </div>
        </aside>

        <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start gap-3 p-4 lg:hidden">
          <div className="pointer-events-auto rounded-xl border border-border bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur">
            {title}
          </div>
        </header>

        {error && (
          <div className="absolute inset-x-4 top-24 z-10 rounded-lg border border-border bg-surface p-4 text-sm shadow-lg lg:top-4">
            <p className="font-medium">Could not load places</p>
            <p className="mt-1 text-muted">{error}</p>
          </div>
        )}

        {!loading && !error && count === 0 && (
          <div className="absolute inset-x-4 top-24 z-10 mx-auto max-w-sm rounded-lg border border-border bg-surface p-4 text-sm shadow-lg lg:top-4">
            <p className="font-medium">No places yet</p>
            <p className="mt-1 text-muted">
              Run the seed file in the Supabase SQL editor and refresh.
            </p>
          </div>
        )}

        {count > 0 && (
          <button
            onClick={() => setListOpen(true)}
            className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium shadow-lg lg:hidden"
          >
            Places ({count})
          </button>
        )}

        {selected && (
          <PlacePanel
            place={selected}
            onClose={() => setSelected(null)}
            onRated={reload}
          />
        )}
      </div>

      {/* Mobile list, as a sheet over the map. Selecting from it closes the
          sheet so the pin it flew to is actually visible. */}
      {listOpen && places && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            aria-label="Close list"
            onClick={() => setListOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[75svh] flex-col rounded-t-2xl border-t border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold">All places</h2>
              <button
                onClick={() => setListOpen(false)}
                aria-label="Close"
                className="rounded-md p-1.5 text-muted hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PlaceList
                places={places}
                selectedId={selected?.id ?? null}
                onSelect={selectPlace}
              />
            </div>
            <div className="border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <SignIn />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
