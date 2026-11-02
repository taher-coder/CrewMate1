/**
 * Real address geocoding via the Google Maps Geocoding API. Requires
 * GOOGLE_MAPS_API_KEY to be set (server-side only — never exposed to the
 * browser, so it's a plain env var, not NEXT_PUBLIC_).
 *
 * Falls back to the Ahmedabad city-centre point (clearly the same
 * placeholder used everywhere else in this app) when the key is missing
 * or the API call fails for any reason — a failed geocode must never
 * block someone from booking or saving an address.
 */

const AHMEDABAD_FALLBACK = { lat: 23.0225, lng: 72.5714 };

export async function geocodeAddress(
  addressLine: string,
  city: string,
): Promise<{ lat: number; lng: number; wasGeocoded: boolean }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const query = `${addressLine}, ${city}, India`.trim();

  if (!apiKey) {
    return { ...AHMEDABAD_FALLBACK, wasGeocoded: false };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return { ...AHMEDABAD_FALLBACK, wasGeocoded: false };

    const data = await res.json();
    const location = data?.results?.[0]?.geometry?.location;
    if (data.status !== "OK" || !location) {
      return { ...AHMEDABAD_FALLBACK, wasGeocoded: false };
    }

    return { lat: location.lat, lng: location.lng, wasGeocoded: true };
  } catch {
    return { ...AHMEDABAD_FALLBACK, wasGeocoded: false };
  }
}

/** PostGIS `geography(Point, 4326)` literal, lng first per WKT/SRID convention. */
export function toPointLiteral(lat: number, lng: number): string {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
