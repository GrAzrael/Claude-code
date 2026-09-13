import { config } from "../config.js";
import type { GeoPoint } from "../types/index.js";

const LOCATIONIQ_SEARCH_URL = "https://us1.locationiq.com/v1/search";

interface LocationIqResult {
  lat: string;
  lon: string;
}

/**
 * Geocodes a free-text address via LocationIQ.
 * Returns null (rather than throwing) when the address can't be resolved,
 * so callers can flag the order instead of failing the whole request.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const url = new URL(LOCATIONIQ_SEARCH_URL);
  url.searchParams.set("key", config.locationIqApiKey);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "gr");

  const response = await fetch(url.toString());

  if (response.status === 404) {
    return null; // LocationIQ returns 404 when nothing matches
  }
  if (!response.ok) {
    throw new Error(`LocationIQ geocoding failed (${response.status}): ${await response.text()}`);
  }

  const results = (await response.json()) as LocationIqResult[];
  const first = results[0];
  if (!first) return null;

  return { lat: Number(first.lat), lng: Number(first.lon) };
}
