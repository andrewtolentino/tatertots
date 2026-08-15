"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { usePlaces, type PlaceWithItems } from "@/lib/usePlaces";
import { formatScore, scoreColor } from "@/lib/score";
import { PlacePanel } from "./PlacePanel";
import { PlaceList } from "./PlaceList";

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

  const { places, error, loading } = usePlaces();

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
        map.fitBounds(bounds, { padding: 70, maxZoom: 14, duration: 0 });
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
      <h1 className="text-base font-semibold">🥔 Tater Tot Tour</h1>
      <p className="text-xs text-muted">{subtitle}</p>
    </div>
  );

  return (
    // h-dvh, not flex-1: `body` only has min-height, so its height is
    // indefinite, and a percentage height inside it resolves to auto — which is
    // 0 here because MapLibre positions its canvas absolutely. dvh also tracks
    // mobile browser chrome as it hides.
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Desktop: a real column beside the map rather than an overlay, so no
          pin can hide underneath it. It collapses below lg rather than md
          because the sidebar and the 24rem detail panel together would leave
          almost no map on a tablet — the same list is then reachable from the
          Places button. */}
      <aside className="hidden w-80 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-4 py-3">{title}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {places && (
            <PlaceList
              places={places}
              selectedId={selected?.id ?? null}
              onSelect={selectPlace}
            />
          )}
        </div>
      </aside>

      <div className="relative h-full min-w-0 flex-1">
        {/* h-full rather than absolute inset-0: maplibre-gl.css sets
            .maplibregl-map{position:relative} and loads after Tailwind's
            utilities, so an `absolute` here loses and the map collapses to 0px. */}
        <div ref={containerRef} className="h-full w-full" />

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
          <PlacePanel place={selected} onClose={() => setSelected(null)} />
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
          </div>
        </div>
      )}
    </div>
  );
}
