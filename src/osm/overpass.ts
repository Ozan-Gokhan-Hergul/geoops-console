import { CONFIG } from "../config.js";
import { CATEGORY_TAGS, type PoiCategory } from "./categories.js";

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassElement[];
}

export class OverpassError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "OverpassError";
  }
}

/**
 * Builds a bounded Overpass QL query from validated numeric/enum inputs only.
 * Tag filters come from the fixed CATEGORY_TAGS map, never from raw client strings.
 */
export function buildOverpassQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  categories: PoiCategory[],
): string {
  const clauses = categories
    .map((category) => CATEGORY_TAGS[category])
    .flatMap(({ key, value }) => {
      const around = `(around:${radiusMeters},${latitude},${longitude})`;
      const tag = `["${key}"="${value}"]`;
      return [`node${tag}${around};`, `way${tag}${around};`, `relation${tag}${around};`];
    })
    .join("\n  ");

  return `[out:json][timeout:${CONFIG.overpassQueryTimeoutS}];
(
  ${clauses}
);
out center;`;
}

export async function queryOverpass(query: string): Promise<OverpassResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.overpassTimeoutMs);

  try {
    const response = await fetch(CONFIG.overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new OverpassError(`Overpass API responded with status ${response.status}`);
    }

    return (await response.json()) as OverpassResponse;
  } catch (error) {
    if (error instanceof OverpassError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new OverpassError("Overpass API request timed out", error);
    }
    throw new OverpassError("Overpass API request failed", error);
  } finally {
    clearTimeout(timeout);
  }
}
