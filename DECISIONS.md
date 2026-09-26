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

## 2026-09-26 — Milestone 2: interactive frontend

- **Separate project, not a monorepo/workspace**: `frontend/` has its own
  `package.json`/lockfile/`vitest` instance, independent from the backend's.
  Simplest option that leaves Milestone 1's build, Docker image and tests
  completely untouched.
- **Vite + vanilla TypeScript + Leaflet**: matches the brief; no framework
  (React/Angular) needed for a click-a-map-and-see-a-list demo.
- **Dev proxy, not backend CORS**: `frontend/vite.config.ts` proxies `/api`
  to `http://localhost:3000` in dev. Avoids touching the backend at all for
  Milestone 2; a real deployment would need same-origin hosting or a CORS
  decision, called out as a limitation rather than solved speculatively.
- **Duplicated request/response types and category/radius constants**
  (`frontend/src/types.ts`, `constants.ts`): kept in sync by hand with
  `src/schema.ts` / `src/osm/categories.ts` / `src/config.ts`. No shared
  package for a two-project demo; a config endpoint would be new backend
  surface area, out of scope.
- **Root `vitest.config.ts` added**: without it, running the backend's
  `npm test` from the repo root also picked up `frontend/test/**` (Vitest's
  default recursive discovery isn't scoped to a project's own directory).
  Scoped backend tests to `test/**/*.test.ts`.
- **Frontend tests limited to pure logic** (`request.ts` radius
  clamping/payload building, `format.ts` distance/label formatting) — no
  jsdom/testing-library added; DOM wiring in `main.ts` is exercised manually
  (see README) rather than adding a heavier test dependency for a demo.
