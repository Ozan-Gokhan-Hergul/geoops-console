import { describe, expect, it } from "vitest";
import { enrichRequestSchema } from "../src/schema.js";

describe("enrichRequestSchema", () => {
  it("accepts a minimal valid request and applies the default radius", () => {
    const result = enrichRequestSchema.safeParse({ latitude: 52.52, longitude: 13.405 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.radiusMeters).toBe(50);
    }
  });

  it("accepts a full valid request", () => {
    const result = enrichRequestSchema.safeParse({
      latitude: 52.52,
      longitude: 13.405,
      radiusMeters: 200,
      categories: ["pharmacy", "bank"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range latitude", () => {
    const result = enrichRequestSchema.safeParse({ latitude: 200, longitude: 13.405 });
    expect(result.success).toBe(false);
  });

  it("rejects out-of-range longitude", () => {
    const result = enrichRequestSchema.safeParse({ latitude: 52.52, longitude: -200 });
    expect(result.success).toBe(false);
  });

  it("rejects a radius above the maximum", () => {
    const result = enrichRequestSchema.safeParse({ latitude: 52.52, longitude: 13.405, radiusMeters: 1001 });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown category", () => {
    const result = enrichRequestSchema.safeParse({
      latitude: 52.52,
      longitude: 13.405,
      categories: ["restaurant"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing coordinates", () => {
    const result = enrichRequestSchema.safeParse({ radiusMeters: 100 });
    expect(result.success).toBe(false);
  });
});
