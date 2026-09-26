export const CONFIG = {
  overpassUrl: process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter",
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
