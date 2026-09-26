import type { NormalizedPoi } from "./types";

export function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
}

const CATEGORY_LABELS: Record<NormalizedPoi["category"], string> = {
  pharmacy: "Pharmacy",
  bank: "Bank",
  dentist: "Dentist",
  supermarket: "Supermarket",
  convenience: "Convenience store",
};

export function categoryLabel(category: NormalizedPoi["category"]): string {
  return CATEGORY_LABELS[category];
}

export function poiDisplayName(poi: NormalizedPoi): string {
  return poi.name ?? `Unnamed ${categoryLabel(poi.category).toLowerCase()}`;
}
