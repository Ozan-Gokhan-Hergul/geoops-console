import { describe, expect, it } from "vitest";
import { categoryLabel, formatDistance, poiDisplayName } from "../src/format";
import type { NormalizedPoi } from "../src/types";

function poi(overrides: Partial<NormalizedPoi> = {}): NormalizedPoi {
  return {
    osmType: "node",
    osmId: 1,
    category: "pharmacy",
    latitude: 41.008241,
    longitude: 28.973577,
    distanceMeters: 24,
    source: "openstreetmap",
    approximate: false,
    ...overrides,
  };
}

describe("formatDistance", () => {
  it("renders sub-kilometer distances in meters", () => {
    expect(formatDistance(24)).toBe("24 m");
    expect(formatDistance(999)).toBe("999 m");
  });

  it("renders distances of 1000m or more in kilometers", () => {
    expect(formatDistance(1500)).toBe("1.50 km");
  });
});

describe("categoryLabel", () => {
  it("returns a human-readable label for each backend category", () => {
    expect(categoryLabel("pharmacy")).toBe("Pharmacy");
    expect(categoryLabel("convenience")).toBe("Convenience store");
  });
});

describe("poiDisplayName", () => {
  it("uses the OSM name when present", () => {
    expect(poiDisplayName(poi({ name: "Example Pharmacy" }))).toBe("Example Pharmacy");
  });

  it("falls back to a category-based label when unnamed", () => {
    expect(poiDisplayName(poi({ name: undefined, category: "bank" }))).toBe("Unnamed bank");
  });
});
