import { CATEGORY_TAGS, type PoiCategory } from "./categories.js";
import type { OverpassElement } from "./overpass.js";

export interface NormalizedPoi {
  osmType: "node" | "way" | "relation";
  osmId: number;
  category: PoiCategory;
  name?: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  source: "openstreetmap";
  approximate: boolean;
}

const EARTH_RADIUS_METERS = 6371000;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

function detectCategory(tags: Record<string, string> | undefined): PoiCategory | undefined {
  if (!tags) return undefined;
  return (Object.keys(CATEGORY_TAGS) as PoiCategory[]).find((category) => {
    const { key, value } = CATEGORY_TAGS[category];
    return tags[key] === value;
  });
}

/**
 * Normalizes a raw Overpass element into a POI. Ways/relations only carry an
 * `out center;` centroid, not their true boundary, so those are flagged approximate.
 */
export function normalizeElement(
  element: OverpassElement,
  originLat: number,
  originLon: number,
): NormalizedPoi | undefined {
  const category = detectCategory(element.tags);
  if (!category) return undefined;

  const isNode = element.type === "node";
  const lat = isNode ? element.lat : element.center?.lat;
  const lon = isNode ? element.lon : element.center?.lon;
  if (lat === undefined || lon === undefined) return undefined;

  return {
    osmType: element.type,
    osmId: element.id,
    category,
    name: element.tags?.name,
    latitude: lat,
    longitude: lon,
    distanceMeters: Math.round(haversineDistanceMeters(originLat, originLon, lat, lon)),
    source: "openstreetmap",
    approximate: !isNode,
  };
}

export function normalizeAndRank(
  elements: OverpassElement[],
  originLat: number,
  originLon: number,
  limit: number,
): NormalizedPoi[] {
  const seen = new Set<string>();
  const pois: NormalizedPoi[] = [];

  for (const element of elements) {
    const poi = normalizeElement(element, originLat, originLon);
    if (!poi) continue;
    const key = `${poi.osmType}/${poi.osmId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pois.push(poi);
  }

  return pois.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, limit);
}
