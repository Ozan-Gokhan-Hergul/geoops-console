import { z } from "zod";
import { CONFIG } from "./config.js";
import { POI_CATEGORIES } from "./osm/categories.js";

export const enrichRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z
    .number()
    .int()
    .positive()
    .max(CONFIG.maxRadiusMeters)
    .default(CONFIG.defaultRadiusMeters),
  categories: z.array(z.enum(POI_CATEGORIES)).min(1).max(POI_CATEGORIES.length).optional(),
});

export type EnrichRequest = z.infer<typeof enrichRequestSchema>;
