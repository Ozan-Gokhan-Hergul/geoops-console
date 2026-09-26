import { describe, expect, it } from "vitest";
import { buildEnrichRequest, clampRadius } from "../src/request";

describe("clampRadius", () => {
  it("keeps a valid value unchanged", () => {
    expect(clampRadius(200)).toBe(200);
  });

  it("rounds fractional values", () => {
    expect(clampRadius(199.6)).toBe(200);
  });

  it("clamps values above the backend's maximum (1000m)", () => {
    expect(clampRadius(5000)).toBe(1000);
  });

  it("clamps non-positive values up to 1", () => {
    expect(clampRadius(0)).toBe(1);
    expect(clampRadius(-50)).toBe(1);
  });

  it("falls back to the default for non-finite input", () => {
    expect(clampRadius(Number.NaN)).toBe(50);
    expect(clampRadius(Number.POSITIVE_INFINITY)).toBe(50);
  });
});

describe("buildEnrichRequest", () => {
  it("builds a request body with a clamped radius and the given categories", () => {
    const body = buildEnrichRequest({
      latitude: 41.008241,
      longitude: 28.973577,
      radiusMeters: 5000,
      categories: ["pharmacy", "bank"],
    });

    expect(body).toEqual({
      latitude: 41.008241,
      longitude: 28.973577,
      radiusMeters: 1000,
      categories: ["pharmacy", "bank"],
    });
  });
});
