import type { ApiErrorBody, EnrichRequestBody, EnrichResponse } from "./types";

// Relative by default so the Vite dev proxy (or same-origin production
// hosting) handles routing; set VITE_API_BASE_URL to override.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export type ApiErrorKind = "validation" | "upstream" | "network";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ApiErrorKind,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function safeJson(response: Response): Promise<ApiErrorBody | null> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return null;
  }
}

export async function enrich(body: EnrichRequestBody): Promise<EnrichResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Could not reach the GeoOps Console API.", "network");
  }

  if (response.status === 502) {
    const payload = await safeJson(response);
    throw new ApiError(
      payload?.message ?? "The public OpenStreetMap Overpass service is currently unavailable.",
      "upstream",
    );
  }

  if (!response.ok) {
    const payload = await safeJson(response);
    throw new ApiError(payload?.message ?? `Request failed (HTTP ${response.status}).`, "validation");
  }

  return (await response.json()) as EnrichResponse;
}
