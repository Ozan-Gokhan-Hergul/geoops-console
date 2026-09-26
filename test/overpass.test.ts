import { afterEach, describe, expect, it, vi } from "vitest";
import { buildOverpassQuery, OverpassError, queryOverpass } from "../src/osm/overpass.js";

describe("buildOverpassQuery", () => {
  it("includes an around-filtered clause for each requested category", () => {
    const query = buildOverpassQuery(52.52, 13.405, 100, ["pharmacy", "bank"]);
    expect(query).toContain('node["amenity"="pharmacy"](around:100,52.52,13.405);');
    expect(query).toContain('way["amenity"="pharmacy"](around:100,52.52,13.405);');
    expect(query).toContain('relation["amenity"="pharmacy"](around:100,52.52,13.405);');
    expect(query).toContain('node["amenity"="bank"](around:100,52.52,13.405);');
    expect(query).toContain("out center;");
  });

  it("uses only the fixed tag mapping for each category", () => {
    const query = buildOverpassQuery(0, 0, 50, ["supermarket"]);
    expect(query).toContain('["shop"="supermarket"]');
    expect(query).not.toContain('["amenity"="supermarket"]');
  });
});

describe("queryOverpass", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns parsed JSON on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ elements: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await queryOverpass("dummy query");
    expect(result).toEqual({ elements: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws OverpassError on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 504, json: async () => ({}) }),
    );

    await expect(queryOverpass("dummy query")).rejects.toBeInstanceOf(OverpassError);
  });

  it("throws OverpassError when the underlying fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(queryOverpass("dummy query")).rejects.toBeInstanceOf(OverpassError);
  });

  it("throws OverpassError on an aborted (timed out) request", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError));

    await expect(queryOverpass("dummy query")).rejects.toBeInstanceOf(OverpassError);
  });
});
