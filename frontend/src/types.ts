// Mirrors the backend's request/response contract (see ../../src/schema.ts
// and ../../src/osm/normalize.ts). Duplicated here since frontend and
// backend are separate builds with no shared package for Milestone 2.

export type PoiCategory = "pharmacy" | "bank" | "dentist" | "supermarket" | "convenience";

export interface EnrichRequestBody {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  categories?: PoiCategory[];
}

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

export interface EnrichResponse {
  pois: NormalizedPoi[];
  attribution: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
}
