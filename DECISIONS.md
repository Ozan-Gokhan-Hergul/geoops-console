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

## 2026-09-27 — Milestone 3: release preparation

Documentation and planning only; no functional code changed.

- **README rewritten for a public-portfolio audience**: leads with what the
  project demonstrates (not just what it does), adds a stack/architecture
  diagram, a project-structure tree, and an explicit AI-assisted-development
  disclosure. Kept all existing technical content (example request, "how it
  works", limitations) rather than dropping it for brevity.
- **No screenshots invented**: the in-session browser tool used to smoke-test
  the UI (Milestone 2) doesn't produce a savable image file, so
  `docs/screenshots/README.md` documents exactly what to capture and how,
  instead of shipping a placeholder image or fabricating a claim of having
  one. Real screenshots are a manual follow-up for the user.
- **Repository hygiene review — no defects found requiring a code change**:
  no `.env` files anywhere in the tree; `.gitignore`/`.dockerignore` already
  cover env variants, `node_modules`, `dist`, and local Claude settings; a
  grep for common secret patterns across tracked files found nothing besides
  an unrelated false positive (`RequestGuard`'s `token` counter). Left as-is
  per the milestone's "don't modify functionality without a concrete defect"
  boundary.
- **Deployment consideration surfaced, not fixed**: the frontend's API proxy
  (`frontend/vite.config.ts`) only works for local Vite dev — a production
  build calls `/api/*` on its own origin by default (`VITE_API_BASE_URL`
  unset). This means same-origin hosting works with zero backend changes,
  while cross-origin hosting (frontend and backend on different domains)
  would require adding CORS to the backend, which does not exist today. This
  is documented as a decision point for Milestone 4, not implemented
  speculatively now.
- **Deployment recommendation**: same-origin single small VPS/container
  (Fastify backend + built frontend static files behind one reverse proxy
  with automatic HTTPS, e.g. Caddy) over a split static-host + API-host
  setup. Rationale: zero CORS work, one TLS certificate, one place to apply
  rate limiting, and the lowest cost/complexity for this project's traffic
  scale. The split approach (frontend on a static/CDN host, backend on a
  small container platform) is documented as the fallback if the frontend
  ever needs independent, high-traffic CDN distribution. Neither has been
  provisioned; this is planning only, pending Milestone 4 approval.
