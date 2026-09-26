import { DEFAULT_RADIUS_METERS, MAX_RADIUS_METERS } from "./constants";
import type { EnrichRequestBody, PoiCategory } from "./types";

export function clampRadius(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RADIUS_METERS;
  return Math.min(Math.max(Math.round(value), 1), MAX_RADIUS_METERS);
}

export function buildEnrichRequest(params: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  categories: PoiCategory[];
}): EnrichRequestBody {
  return {
    latitude: params.latitude,
    longitude: params.longitude,
    radiusMeters: clampRadius(params.radiusMeters),
    categories: params.categories,
  };
}
