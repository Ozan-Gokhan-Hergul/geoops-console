import { CONFIG } from "../src/config.js";
import { enrichLocation } from "../src/enrichService.js";
import { OverpassError } from "../src/osm/overpass.js";
import { enrichRequestSchema } from "../src/schema.js";
import { FixedWindowRateLimiter } from "./rateLimiter.js";

export interface Env {
  /** Optional override for the public Overpass endpoint (wrangler.toml [vars] or a secret). */
  OVERPASS_URL?: string;
}

// Module-scope state persists only for the lifetime of a single Worker
// isolate — Cloudflare may run many isolates for this Worker at once and
// can recycle any of them at any time. This cache/limiter/rate-limiter combo
// is a best-effort, per-isolate optimization (mirrors the Node deployment's
// own per-process caveat, just with a shorter, less predictable lifetime).
// It is NOT a distributed cache or a guaranteed rate limit — see
// DECISIONS.md for the full reasoning and what a real fix would require.
const inboundRateLimiter = new FixedWindowRateLimiter({
  max: CONFIG.rateLimit.max,
  windowMs: CONFIG.rateLimit.timeWindowMs,
});

let overpassUrlApplied = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function formatZodError(error: import("zod").ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

async function handleEnrich(request: Request): Promise<Response> {
  const clientIp = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (!inboundRateLimiter.allow(clientIp)) {
    return json(
      { error: "rate_limited", message: "Too many requests. Please slow down and try again shortly." },
      429,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_request", message: "Request body must be valid JSON." }, 400);
  }

  const parsed = enrichRequestSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        error: "invalid_request",
        message: "Request validation failed",
        details: formatZodError(parsed.error),
      },
      400,
    );
  }

  try {
    const result = await enrichLocation(parsed.data);
    return json({ pois: result.pois, attribution: "© OpenStreetMap contributors" });
  } catch (error) {
    if (error instanceof OverpassError) {
      return json(
        {
          error: "upstream_unavailable",
          message: "The OpenStreetMap Overpass API is currently unavailable. Please try again later.",
        },
        502,
      );
    }
    throw error;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // `env` is only available inside the handler (not at module scope), and
    // is identical on every call for a given deployment, so applying it once
    // per isolate is enough — this never varies per-request.
    if (!overpassUrlApplied && env.OVERPASS_URL) {
      CONFIG.overpassUrl = env.OVERPASS_URL;
      overpassUrlApplied = true;
    }

    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ status: "ok" });
    }

    if (url.pathname === "/api/enrich") {
      if (request.method !== "POST") {
        return json({ error: "method_not_allowed", message: "Use POST." }, 405);
      }
      return handleEnrich(request);
    }

    // Static assets (the built frontend) are served by the platform before
    // this Worker ever runs; reaching here means no asset matched either.
    return json({ error: "not_found", message: "Not found." }, 404);
  },
};
