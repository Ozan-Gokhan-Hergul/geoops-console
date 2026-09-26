import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../src/app.js";

function mockOverpassResponse(elements: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ elements }),
  });
}

describe("POST /api/enrich", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  it("returns 400 for an invalid body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/enrich",
      payload: { latitude: 200, longitude: 13.405 },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe("invalid_request");
  });

  it("returns the nearest three normalized POIs", async () => {
    vi.stubGlobal(
      "fetch",
      mockOverpassResponse([
        { type: "node", id: 1, lat: 10.001, lon: 20.001, tags: { amenity: "pharmacy", name: "A" } },
        { type: "node", id: 2, lat: 10.0005, lon: 20.0005, tags: { amenity: "pharmacy", name: "B" } },
        { type: "way", id: 3, center: { lat: 10.0002, lon: 20.0002 }, tags: { shop: "supermarket", name: "C" } },
        { type: "node", id: 4, lat: 10.01, lon: 20.01, tags: { amenity: "bank", name: "D" } },
      ]),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/enrich",
      payload: { latitude: 10, longitude: 20, radiusMeters: 500 },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.pois).toHaveLength(3);
    expect(body.attribution).toContain("OpenStreetMap");
    expect(body.pois[0].name).toBe("C");
    expect(body.pois[0].approximate).toBe(true);
    expect(body.pois[1].name).toBe("B");
  });

  it("returns an empty list when no POIs are found", async () => {
    vi.stubGlobal("fetch", mockOverpassResponse([]));

    const response = await app.inject({
      method: "POST",
      url: "/api/enrich",
      payload: { latitude: 11, longitude: 21 },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().pois).toEqual([]);
  });

  it("returns 502 when the Overpass API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));

    const response = await app.inject({
      method: "POST",
      url: "/api/enrich",
      payload: { latitude: 12, longitude: 22 },
    });

    expect(response.statusCode).toBe(502);
    expect(response.json().error).toBe("upstream_unavailable");
  });

  it("serves repeated identical requests from cache without re-querying Overpass", async () => {
    const fetchMock = mockOverpassResponse([
      { type: "node", id: 5, lat: 30.0001, lon: 40.0001, tags: { amenity: "dentist" } },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const payload = { latitude: 30, longitude: 40, radiusMeters: 50 };
    const first = await app.inject({ method: "POST", url: "/api/enrich", payload });
    const second = await app.inject({ method: "POST", url: "/api/enrich", payload });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not conflate distinct coordinates that previously rounded to the same cache key", async () => {
    // Both values round to the same 5-decimal string ("50.00000") but are
    // distinct, real coordinates a few metres apart.
    const latA = 50.000001;
    const latB = 50.000004;
    expect(latA.toFixed(5)).toBe(latB.toFixed(5));
    expect(latA).not.toBe(latB);

    const fetchMock = vi.fn().mockImplementation(async (_url: string, options: RequestInit) => {
      const body = options.body as string;
      const elements = body.includes(String(latA))
        ? [{ type: "node", id: 101, lat: latA, lon: 60, tags: { amenity: "pharmacy", name: "Near A" } }]
        : [{ type: "node", id: 102, lat: latB, lon: 60, tags: { amenity: "pharmacy", name: "Near B" } }];
      return { ok: true, json: async () => ({ elements }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const basePayload = { longitude: 60, radiusMeters: 50, categories: ["pharmacy"] };
    const first = await app.inject({
      method: "POST",
      url: "/api/enrich",
      payload: { latitude: latA, ...basePayload },
    });
    const second = await app.inject({
      method: "POST",
      url: "/api/enrich",
      payload: { latitude: latB, ...basePayload },
    });

    expect(first.json().pois[0].name).toBe("Near A");
    expect(second.json().pois[0].name).toBe("Near B");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
