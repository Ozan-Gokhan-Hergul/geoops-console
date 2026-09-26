# Decisions

## 2026-09-26 — Milestone 1: location-enrichment backend

- **Fastify over Express**: lighter, native TS-friendly, built-in schema/plugin
  ergonomics; used `fastify@5` (not `4`) since `4.x` had known high-severity
  advisories at install time.
- **Overpass query construction**: categories map to a fixed
  `{ key, value }` OSM tag table (`src/osm/categories.ts`). The client sends
  only enum values; raw Overpass QL is never accepted from a request.
- **Node/way/relation handling**: all three are queried with `out center;`.
  Nodes use exact coordinates; ways/relations use their returned centroid and
  are flagged `approximate: true` since a centroid isn't the true nearest
  point on the geometry.
- **Cache**: simple in-process `Map`-based TTL cache (10 min), keyed on exact 
  validated coordinates + radius + sorted category list. No Redis — out of 
  scope for Milestone 1.
- **Rate limiting**: `@fastify/rate-limit`, 20 req/min per instance, to avoid
  hammering the public Overpass instance (no guaranteed quota).
