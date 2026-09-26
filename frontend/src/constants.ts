import type { PoiCategory } from "./types";

// Mirrors backend/src/config.ts and src/osm/categories.ts (Milestone 1).
// Kept in sync by hand; there is no shared package for this demo.
export const POI_CATEGORIES: PoiCategory[] = [
  "pharmacy",
  "bank",
  "dentist",
  "supermarket",
  "convenience",
];

export const DEFAULT_RADIUS_METERS = 50;
export const MAX_RADIUS_METERS = 1000;

export const SULTANAHMET = { latitude: 41.008241, longitude: 28.973577 };
