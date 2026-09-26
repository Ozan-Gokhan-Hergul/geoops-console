import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { enrichLocation } from "../enrichService.js";
import { OverpassError } from "../osm/overpass.js";
import { enrichRequestSchema } from "../schema.js";

export async function enrichRoute(app: FastifyInstance): Promise<void> {
  app.post("/api/enrich", async (request, reply) => {
    const parsed = enrichRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "invalid_request",
        message: "Request validation failed",
        details: formatZodError(parsed.error),
      });
    }

    const { latitude, longitude, radiusMeters, categories } = parsed.data;

    try {
      const result = await enrichLocation({ latitude, longitude, radiusMeters, categories });
      return reply.send({
        pois: result.pois,
        attribution: "© OpenStreetMap contributors",
      });
    } catch (error) {
      if (error instanceof OverpassError) {
        request.log.warn({ err: error }, "Overpass query failed");
        return reply.status(502).send({
          error: "upstream_unavailable",
          message: "The OpenStreetMap Overpass API is currently unavailable. Please try again later.",
        });
      }
      throw error;
    }
  });
}

function formatZodError(error: ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}
