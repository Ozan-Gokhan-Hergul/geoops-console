# Project Brief

GeoOps Console is a public portfolio demo showcasing backend, geospatial and
data-engineering work, built on synthetic/public data only.

## Milestones

- **Milestone 1 (done):** Location-enrichment backend. `POST /api/enrich`
  takes a coordinate + radius + optional POI categories, queries the public
  OSM Overpass API, normalizes/deduplicates/ranks results, returns the
  nearest three. In-memory cache, rate limiting, outbound concurrency cap,
  timeouts, and tests with mocked Overpass responses. No database or auth.

- **Milestone 2 (done):** Minimal interactive frontend (`frontend/`, Vite +
  vanilla TypeScript + Leaflet). Map centered on Sultanahmet, Istanbul;
  click-to-select location; radius input and category checkboxes matching
  the backend's limits/enum; a Search button calling `POST /api/enrich`
  (no calls on map move/click alone, no duplicate in-flight submissions);
  result markers and list distinguishing exact vs. approximate-centroid
  POIs; explicit loading/empty/upstream-unavailable states with no
  auto-retry. Dev-only Vite proxy to the backend, no CORS/auth changes to
  the backend. Unit tests for the pure request-building/formatting logic.

- **Milestone 3 (done): Release preparation.** Documentation-and-planning
  milestone, no functional changes. Rewrote `README.md` for a public
  portfolio audience (what it demonstrates, stack/architecture, project
  structure, exact commands, limitations, AI-assisted development
  disclosure); added `docs/screenshots/` with capture instructions (no
  screenshots invented); reviewed repo hygiene, `.gitignore`/`.dockerignore`,
  Docker config and the frontend's dev-only API proxy (no secrets found, no
  functional defects — see `DECISIONS.md`); produced a deployment
  recommendation (not yet provisioned).

- **Milestone 4 (planned, not started): Deployment.** Ship the reviewed
  recommendation from Milestone 3: same-origin hosting of the Fastify
  backend plus the built frontend behind a single reverse proxy with
  automatic HTTPS (see `DECISIONS.md` for the comparison against a split
  static-host + API-host approach). Requires explicit approval before any
  provisioning; must not touch the user's existing private VPS/WireGuard
  setup, and must not introduce paid services without asking first.

## Non-goals (for now)

- Database, authentication, Redis, message queues, microservices, batch
  enrichment, PostGIS, a UI framework, or auth of any kind.
- Any paid service, and any change to the user's existing private VPS or
  WireGuard setup.
- Any dependency on the user's employer's code, data, or infrastructure.
