# Project Brief

GeoOps Console is a public portfolio demo showcasing backend, geospatial and
data-engineering work, built on synthetic/public data only.

**Live**: [geoops.ozanhergul.com.tr](https://geoops.ozanhergul.com.tr/)
(Cloudflare Workers, HTTPS, deployed under Milestone 4).

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

- **Milestone 4 (done): Cloudflare Workers deployment.** Supersedes
  Milestone 3's VPS-reverse-proxy sketch — deployed to a separate Cloudflare
  Workers project (`geoops.ozanhergul.com.tr`), distinct from the existing
  `ozanhergul.com.tr` Workers Static Assets site, which was not touched.
  Verified against official docs (not assumed) that Fastify is not
  supported on Workers; built a small native `fetch` adapter
  (`worker/index.ts`) that reuses the existing validation/query/
  normalization/cache/concurrency logic from `src/` unmodified, with
  Workers Static Assets serving `frontend/dist`. Compatibility was verified
  locally with `wrangler dev` against the real Workers runtime (workerd)
  before deployment. The user then provisioned the Worker, DNS, and ran the
  deploy themselves (`wrangler login` + `wrangler deploy` are manual,
  account-holder actions never performed by the assistant). Confirmed
  working live over HTTPS, including mobile layout and real POI
  enrichment. The Node/Fastify/Docker path is untouched and remains the
  default for local development. See `DECISIONS.md` for the full
  compatibility rationale and citations.

- **Milestone 5 (planned, not started):** Not yet scoped. Do not start
  without explicit approval.

## Non-goals (for now)

- Database, authentication, Redis, message queues, microservices, batch
  enrichment, PostGIS, a UI framework, or auth of any kind.
- Any paid service, and any change to the user's existing private VPS,
  WireGuard setup, or the existing `ozanhergul.com.tr` Cloudflare Workers
  site.
- Any dependency on the user's employer's code, data, or infrastructure.
