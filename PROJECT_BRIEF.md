# Project Brief

GeoOps Console is a public portfolio demo showcasing backend, geospatial and
data-engineering work, built on synthetic/public data only.

## Milestones

- **Milestone 1 (done):** Location-enrichment backend. `POST /api/enrich`
  takes a coordinate + radius + optional POI categories, queries the public
  OSM Overpass API, normalizes/deduplicates/ranks results, returns the
  nearest three. In-memory cache, rate limiting, timeouts, and tests with
  mocked Overpass responses. No database, auth, or frontend yet.

- **Milestone 2+:** Not yet scoped. Do not start without explicit approval.

## Non-goals (for now)

- Database, authentication, frontend, Redis, message queues, microservices.
- Any dependency on the user's employer's code, data, or infrastructure.
