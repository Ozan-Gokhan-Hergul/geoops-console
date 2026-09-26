import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { CONFIG } from "./config.js";
import { enrichRoute } from "./routes/enrich.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(rateLimit, {
    max: CONFIG.rateLimit.max,
    timeWindow: CONFIG.rateLimit.timeWindowMs,
  });

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(enrichRoute);

  return app;
}
