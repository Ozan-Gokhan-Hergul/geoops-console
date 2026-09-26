// Read via globalThis (not a bare `process.env` reference) since this module
// is also imported by worker/index.ts (Cloudflare Workers), where `process`
// is neither a global nor an ambient type unless nodejs_compat is enabled.
// The cast avoids depending on @types/node so this still type-checks under
// the Worker's own tsconfig; behavior under Node is unchanged.
const overpassUrlFromEnv = (
  globalThis as { process?: { env?: Record<string, string | undefined> } }
).process?.env?.OVERPASS_URL;

export const CONFIG = {
  overpassUrl: overpassUrlFromEnv ?? "https://overpass-api.de/api/interpreter",
  overpassTimeoutMs: 8000,
  overpassQueryTimeoutS: 10,
  cacheTtlMs: 10 * 60 * 1000,
  defaultRadiusMeters: 50,
  maxRadiusMeters: 1000,
  resultLimit: 3,
  rateLimit: {
    max: 20,
    timeWindowMs: 60 * 1000,
  },
  overpassConcurrency: 2,
};
