import { TtlCache } from "./cache.js";
import { CONFIG } from "./config.js";
import { POI_CATEGORIES, type PoiCategory } from "./osm/categories.js";
import { normalizeAndRank, type NormalizedPoi } from "./osm/normalize.js";
import { buildOverpassQuery, queryOverpass } from "./osm/overpass.js";

export interface EnrichParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  categories?: PoiCategory[];
}

export interface EnrichResult {
  pois: NormalizedPoi[];
}

const cache = new TtlCache<EnrichResult>(CONFIG.cacheTtlMs);

function cacheKey(params: EnrichParams): string {
  const categories = (params.categories ?? [...POI_CATEGORIES]).slice().sort().join(",");
  const lat = params.latitude.toFixed(5);
  const lon = params.longitude.toFixed(5);
  return `${lat}:${lon}:${params.radiusMeters}:${categories}`;
}

export async function enrichLocation(params: EnrichParams): Promise<EnrichResult> {
  const key = cacheKey(params);
  const cached = cache.get(key);
  if (cached) return cached;

  const categories = params.categories ?? [...POI_CATEGORIES];
  const query = buildOverpassQuery(params.latitude, params.longitude, params.radiusMeters, categories);
  const response = await queryOverpass(query);
  const pois = normalizeAndRank(
    response.elements,
    params.latitude,
    params.longitude,
    CONFIG.resultLimit,
  );

  const result: EnrichResult = { pois };
  cache.set(key, result);
  return result;
}
