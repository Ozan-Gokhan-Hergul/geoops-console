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

- **Milestone 3+:** Not yet scoped. Do not start without explicit approval.

## Non-goals (for now)

- Database, authentication, Redis, message queues, microservices, deployment.
- Any dependency on the user's employer's code, data, or infrastructure.
