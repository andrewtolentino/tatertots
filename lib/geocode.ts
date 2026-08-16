export type GeocodeHit = {
  lat: number;
  lng: number;
  label: string;
};

/**
 * Address → coordinates, via OpenStreetMap's Nominatim.
 *
 * Called only when the crew approves a suggestion — a handful of lookups a
 * month, well inside Nominatim's usage policy for occasional use. It is a
 * convenience, not a source of truth: the approve form shows the result and
 * lets you correct it before anything is written, because a wrong pin is worse
 * than no pin.
 */
export async function geocode(query: string): Promise<GeocodeHit | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    if (!results.length) return null;

    return {
      lat: Number(results[0].lat),
      lng: Number(results[0].lon),
      label: results[0].display_name,
    };
  } catch {
    return null;
  }
}
