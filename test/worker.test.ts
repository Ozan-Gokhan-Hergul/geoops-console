import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFIG } from "../src/config.js";
import worker from "../worker/index.js";

// Minimal ExecutionContext stub: the handler never calls waitUntil/
// passThroughOnException, so an empty object is enough for these tests.
// (Cast via `any` rather than the real `ExecutionContext` type, since that
// type only exists under worker/tsconfig.json, not this test file's.)
const ctx = {} as any;
const env = {};

function request(
  path: string,
  init: RequestInit & { ip?: string } = {},
): Request {
  const { ip, headers, ...rest } = init;
  const h = new Headers(headers);
  if (ip) h.set("cf-connecting-ip", ip);
  return new Request(`https://geoops.example.test${path}`, { ...rest, headers: h });
}

function mockOverpassResponse(elements: unknown[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ elements }),
  });
}

describe("worker fetch handler", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("responds to GET /health", async () => {
    const response = await worker.fetch(request("/health"), env, ctx);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns 404 for an unknown path", async () => {
    const response = await worker.fetch(request("/nope", { ip: "203.0.113.10" }), env, ctx);
    expect(response.status).toBe(404);
  });

  it("returns 405 for a non-POST /api/enrich request", async () => {
    const response = await worker.fetch(
      request("/api/enrich", { method: "GET", ip: "203.0.113.11" }),
      env,
      ctx,
    );
    expect(response.status).toBe(405);
  });

  it("returns 400 for an invalid body", async () => {
    const response = await worker.fetch(
      request("/api/enrich", {
        method: "POST",
        ip: "203.0.113.12",
        body: JSON.stringify({ latitude: 200, longitude: 13.405 }),
      }),
      env,
      ctx,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_request");
  });

  it("returns 400 for a non-JSON body", async () => {
    const response = await worker.fetch(
      request("/api/enrich", { method: "POST", ip: "203.0.113.13", body: "not json" }),
      env,
      ctx,
    );
    expect(response.status).toBe(400);
  });

  it("returns the nearest POIs for a valid request", async () => {
    vi.stubGlobal(
      "fetch",
      mockOverpassResponse([
        { type: "node", id: 501, lat: 60.001, lon: 70.001, tags: { amenity: "pharmacy", name: "Worker Test Pharmacy" } },
      ]),
    );

    const response = await worker.fetch(
      request("/api/enrich", {
        method: "POST",
        ip: "203.0.113.14",
        body: JSON.stringify({ latitude: 60, longitude: 70, radiusMeters: 500 }),
      }),
      env,
      ctx,
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pois).toHaveLength(1);
    expect(body.pois[0].name).toBe("Worker Test Pharmacy");
    expect(body.attribution).toContain("OpenStreetMap");
  });

  it("returns 502 when the Overpass API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));

    const response = await worker.fetch(
      request("/api/enrich", {
        method: "POST",
        ip: "203.0.113.15",
        body: JSON.stringify({ latitude: 61, longitude: 71 }),
      }),
      env,
      ctx,
    );

    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("upstream_unavailable");
  });

  it("rate-limits repeated requests from the same client IP (per-isolate, best-effort)", async () => {
    const ip = "203.0.113.99";
    const invalidBody = JSON.stringify({ latitude: "not-a-number" });

    let lastStatus = 200;
    for (let i = 0; i < CONFIG.rateLimit.max + 1; i++) {
      const response = await worker.fetch(
        request("/api/enrich", { method: "POST", ip, body: invalidBody }),
        env,
        ctx,
      );
      lastStatus = response.status;
    }

    expect(lastStatus).toBe(429);
  });
});
