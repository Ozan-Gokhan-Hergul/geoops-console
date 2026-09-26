export const POI_CATEGORIES = [
  "pharmacy",
  "bank",
  "dentist",
  "supermarket",
  "convenience",
] as const;

export type PoiCategory = (typeof POI_CATEGORIES)[number];

/**
 * Predefined OSM tag per category. Values are fixed here so the server never
 * builds an Overpass query from client-supplied tag/value strings.
 */
export const CATEGORY_TAGS: Record<PoiCategory, { key: string; value: string }> = {
  pharmacy: { key: "amenity", value: "pharmacy" },
  bank: { key: "amenity", value: "bank" },
  dentist: { key: "amenity", value: "dentist" },
  supermarket: { key: "shop", value: "supermarket" },
  convenience: { key: "shop", value: "convenience" },
};

export function isPoiCategory(value: string): value is PoiCategory {
  return (POI_CATEGORIES as readonly string[]).includes(value);
}
