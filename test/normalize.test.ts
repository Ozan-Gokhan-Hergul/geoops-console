import { describe, expect, it } from "vitest";
import { haversineDistanceMeters, normalizeAndRank, normalizeElement } from "../src/osm/normalize.js";
import type { OverpassElement } from "../src/osm/overpass.js";

const ORIGIN = { lat: 52.52, lon: 13.405 };

describe("haversineDistanceMeters", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistanceMeters(52.52, 13.405, 52.52, 13.405)).toBe(0);
  });

  it("returns a plausible distance for two nearby points", () => {
    const distance = haversineDistanceMeters(52.52, 13.405, 52.521, 13.406);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(200);
  });
});

describe("normalizeElement", () => {
  it("normalizes a node with exact coordinates", () => {
    const element: OverpassElement = {
      type: "node",
      id: 1,
      lat: 52.5201,
      lon: 13.4051,
      tags: { amenity: "pharmacy", name: "Test Pharmacy" },
    };
    const poi = normalizeElement(element, ORIGIN.lat, ORIGIN.lon);
    expect(poi).toBeDefined();
    expect(poi?.approximate).toBe(false);
    expect(poi?.category).toBe("pharmacy");
    expect(poi?.name).toBe("Test Pharmacy");
    expect(poi?.osmType).toBe("node");
  });

  it("normalizes a way using its center and flags it approximate", () => {
    const element: OverpassElement = {
      type: "way",
      id: 2,
      center: { lat: 52.5202, lon: 13.4052 },
      tags: { shop: "supermarket" },
    };
    const poi = normalizeElement(element, ORIGIN.lat, ORIGIN.lon);
    expect(poi).toBeDefined();
    expect(poi?.approximate).toBe(true);
    expect(poi?.category).toBe("supermarket");
  });

  it("normalizes a relation using its center and flags it approximate", () => {
    const element: OverpassElement = {
      type: "relation",
      id: 3,
      center: { lat: 52.5203, lon: 13.4053 },
      tags: { amenity: "bank" },
    };
    const poi = normalizeElement(element, ORIGIN.lat, ORIGIN.lon);
    expect(poi).toBeDefined();
    expect(poi?.approximate).toBe(true);
    expect(poi?.category).toBe("bank");
  });

  it("returns undefined when tags do not match a known category", () => {
    const element: OverpassElement = { type: "node", id: 4, lat: 52.52, lon: 13.405, tags: { amenity: "cafe" } };
    expect(normalizeElement(element, ORIGIN.lat, ORIGIN.lon)).toBeUndefined();
  });

  it("returns undefined when a way/relation has no center", () => {
    const element: OverpassElement = { type: "way", id: 5, tags: { amenity: "dentist" } };
    expect(normalizeElement(element, ORIGIN.lat, ORIGIN.lon)).toBeUndefined();
  });
});

describe("normalizeAndRank", () => {
  it("sorts by distance and limits results", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 52.53, lon: 13.42, tags: { amenity: "pharmacy" } },
      { type: "node", id: 2, lat: 52.5201, lon: 13.4051, tags: { amenity: "pharmacy" } },
      { type: "way", id: 3, center: { lat: 52.521, lon: 13.406 }, tags: { shop: "convenience" } },
      { type: "node", id: 4, lat: 52.525, lon: 13.41, tags: { amenity: "bank" } },
    ];
    const result = normalizeAndRank(elements, ORIGIN.lat, ORIGIN.lon, 3);
    expect(result).toHaveLength(3);
    expect(result[0].osmId).toBe(2);
    expect(result[0].distanceMeters).toBeLessThanOrEqual(result[1].distanceMeters);
    expect(result[1].distanceMeters).toBeLessThanOrEqual(result[2].distanceMeters);
  });

  it("de-duplicates elements with the same type/id", () => {
    const elements: OverpassElement[] = [
      { type: "node", id: 1, lat: 52.5201, lon: 13.4051, tags: { amenity: "pharmacy" } },
      { type: "node", id: 1, lat: 52.5201, lon: 13.4051, tags: { amenity: "pharmacy" } },
    ];
    const result = normalizeAndRank(elements, ORIGIN.lat, ORIGIN.lon, 3);
    expect(result).toHaveLength(1);
  });

  it("returns an empty array for no matches", () => {
    expect(normalizeAndRank([], ORIGIN.lat, ORIGIN.lon, 3)).toEqual([]);
  });
});
