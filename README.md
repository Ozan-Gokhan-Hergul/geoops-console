# GeoOps Console

A location-enrichment portfolio demo: pick a point on a map, and get back the
nearest real points of interest around it, sourced live from OpenStreetMap.

It demonstrates:

- Designing a small, safe public API around a third-party data source
  (server-built queries, never raw client input passed through).
- Correctly handling geospatial data quirks — OSM points vs. areas, exact vs.
  approximate coordinates, distance calculation and ranking.
- Being a good citizen of a shared public API: caching, timeouts, inbound
  rate limiting, and an outbound concurrency cap.
- A small full-stack pairing (Fastify API + a Leaflet map UI) with tests on
  both sides, kept intentionally free of unnecessary frameworks or infra.

This is a personal portfolio project. It uses only public OpenStreetMap
data — no proprietary datasets, credentials, or business logic.

![Search results near Sultanahmet: map markers and a result list showing category, name, and distance for the three nearest points of interest](docs/screenshots/search-results.png)

## Stack & architecture

- **Backend**: Node.js 20+, TypeScript, [Fastify](https://fastify.dev/), zod
  for validation, `@fastify/rate-limit`. Tested with Vitest against mocked
  Overpass responses (no network access required for tests).
- **Frontend**: [Vite](https://vitejs.dev/) + vanilla TypeScript +
  [Leaflet](https://leafletjs.com/). No React/Angular — the UI is small
  enough not to need one. Tested with Vitest (pure logic only).
- **External dependency**: the public
  [OpenStreetMap Overpass API](https://overpass-api.de/), queried
  server-side only.

```
Browser (Leaflet map + form)
   │  POST /api/enrich { latitude, longitude, radiusMeters, categories }
   ▼
Fastify backend
   │  validate → build fixed-shape Overpass QL query → cache check
   ▼
Public Overpass API  (nodes / ways / relations, out center;)
   │
   ▼
Backend normalizes + dedupes + ranks → nearest 3 POIs
   │  JSON response (+ "approximate" flag for way/relation centroids)
   ▼
Frontend renders map markers + a result list
```

## Project structure

```
geoops-console/
├── src/                        # Backend (Fastify + TypeScript)
│   ├── server.ts               # Entry point
│   ├── app.ts                  # Fastify app: rate limiting, routes
│   ├── config.ts               # Central runtime config (limits, timeouts)
│   ├── schema.ts               # zod request validation
│   ├── enrichService.ts        # Cache + orchestration for /api/enrich
│   ├── cache.ts                # In-memory TTL cache
│   ├── concurrencyLimiter.ts   # Caps concurrent outbound Overpass calls
│   ├── osm/
│   │   ├── categories.ts       # Fixed POI category → OSM tag mapping
│   │   ├── overpass.ts         # Overpass query builder + HTTP client
│   │   └── normalize.ts        # Node/way/relation normalization & ranking
│   └── routes/enrich.ts        # POST /api/enrich handler
├── test/                       # Backend tests (Vitest, mocked Overpass)
├── frontend/                   # Frontend (Vite + vanilla TS + Leaflet)
│   ├── src/
│   │   ├── main.ts             # DOM wiring: form, search flow, state
│   │   ├── map.ts              # Leaflet map, markers, radius circle
│   │   ├── api.ts              # Fetch client for /api/enrich
│   │   ├── request.ts          # Radius clamping / request building (pure)
│   │   ├── format.ts           # Distance/label formatting (pure)
│   │   ├── requestGuard.ts     # Discards stale in-flight responses
│   │   ├── types.ts            # Mirrors the backend's request/response contract
│   │   └── constants.ts        # Mirrors the backend's categories/limits
│   ├── test/                   # Frontend unit tests (pure logic only)
│   └── vite.config.ts          # Dev-only proxy to the backend
├── docs/screenshots/           # Portfolio screenshots (see below)
├── Dockerfile, docker-compose.yml  # Backend container for local/demo use
├── PROJECT_BRIEF.md, DECISIONS.md  # Scope and decision log
└── README.md
```

## Screenshots

All captured from the running app, backend + frontend both local, no data
altered afterward.

![Initial map view, centered on Sultanahmet, Istanbul, with all five categories selected and no location chosen yet](docs/screenshots/map-initial.png)
*Initial view — the map loads centered on Sultanahmet, Istanbul; all five
categories are selected by default and the Search button is disabled until a
location is picked.*

![A location selected on the map, showing the selection marker and a circle for the current search radius](docs/screenshots/map-selected.png)
*Location selected — the marker and the radius circle (here, 150 m) appear
immediately on click, before Search is even pressed.*

![Empty-result state after searching a very small radius with no matching points of interest](docs/screenshots/state-empty.png)
*Empty-result state — a 15 m radius here turns up nothing; handled with an
explicit message rather than an empty, unexplained list.*

![Upstream-unavailable state shown when the public Overpass API cannot be reached](docs/screenshots/state-unavailable.png)
*Upstream-unavailable state — if the public Overpass API is down or times
out, the UI says so plainly instead of retrying automatically or leaking a
raw error.*

## Requirements

- Node.js 20+
- Docker (optional, for containerized local backend dev)

## Backend: install, build, test, run

```bash
npm install
npm run build   # tsc
npm test        # vitest run — 33 tests, mocked Overpass, no network needed
npm run dev     # http://localhost:3000, hot reload (tsx watch)
```

Or with Docker:

```bash
docker compose up --build
```

## Frontend: install, build, test, run

The frontend is a separate project in [`frontend/`](frontend), with its own
`package.json`. With the backend running on `http://localhost:3000`:

```bash
cd frontend
npm install
npm run build   # tsc --noEmit + vite build (frontend/dist)
npm test        # vitest run — 15 tests, pure logic only, no browser needed
npm run dev     # http://localhost:5173, hot reload
```

The Vite dev server proxies `/api/*` to `http://localhost:3000`
(`frontend/vite.config.ts`), so the browser only ever talks to its own
origin — no CORS setup or API key needed for local development. To point a
production build at a different backend origin, set `VITE_API_BASE_URL` at
build time; it defaults to relative URLs (same-origin).

Click the map to select a location, adjust the radius/categories, and press
**Search**.

## Example request

Coordinates below are Sultanahmet, Istanbul:

```bash
curl -X POST http://localhost:3000/api/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 41.008241,
    "longitude": 28.973577,
    "radiusMeters": 200,
    "categories": ["pharmacy", "supermarket", "convenience", "bank"]
  }'
```

Example response:

```json
{
  "pois": [
    {
      "osmType": "node",
      "osmId": 123456789,
      "category": "pharmacy",
      "name": "Example Pharmacy",
      "latitude": 41.008241,
      "longitude": 28.973577,
      "distanceMeters": 24,
      "source": "openstreetmap",
      "approximate": false
    }
  ],
  "attribution": "© OpenStreetMap contributors"
}
```

`categories` is optional; omitting it searches all five supported categories
(`pharmacy`, `bank`, `dentist`, `supermarket`, `convenience`). `radiusMeters`
defaults to 50 and is capped at 1000.

## How it works

- Requests are validated (coordinate ranges, radius cap, category enum)
  before any Overpass query is built. Queries are assembled server-side from
  a fixed category → OSM tag mapping — the client can never inject arbitrary
  Overpass syntax.
- Nodes, ways and relations are all queried (`out center;`), since a POI can
  be mapped as any of the three. Ways/relations only carry a centroid, not
  their true shape, so those results are marked `"approximate": true` (shown
  as "approximate centroid" in the UI, on both markers and the result list).
- Results are deduplicated, sorted by distance, and **only the closest three
  are returned** — this is a fixed, non-configurable limit.
- Responses are cached in-memory for 10 minutes per (coordinate, radius,
  categories) key, to reduce load on the public Overpass instance.
- Inbound requests to `/api/enrich` are rate-limited (20/min by default);
  outbound Overpass calls are separately capped at 2 concurrent requests
  application-wide, each with an 8-second timeout.

## Known limitations

- **Public Overpass is a best-effort dependency**, not a guaranteed service.
  There is no quota, uptime SLA, or response-time guarantee from
  `overpass-api.de`. Upstream failures surface as `502 upstream_unavailable`
  rather than crashing the service, and the UI does not auto-retry.
- **Only the nearest three POIs are ever returned**, by design — this is a
  demo of the enrichment pattern, not a full search/listing API.
- **Way/relation distances are centroid-based approximations**, not true
  nearest-edge distances. Flagged explicitly (`approximate: true`) rather
  than presented as exact.
- **In-memory cache and rate limiter are per-process** and reset on
  restart — correct for a single-instance demo, not for horizontal scaling
  or multiple backend replicas.
- **No database, authentication, or production CORS/deployment
  configuration.** The frontend's dev proxy only covers local Vite
  development (see "Deployment" in `PROJECT_BRIEF.md` for the planned
  approach).

## Attribution

Point-of-interest data © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors, made available under the Open Database License (ODbL).

## AI-assisted development

This project was built with AI pair-programming (Claude Code), under my
direction: I defined the requirements and scope for each milestone, reviewed
the generated code and architecture decisions, and manually tested the
running application — including live requests against the public Overpass
API — before accepting each change. Design tradeoffs and their rationale are
recorded in [`DECISIONS.md`](DECISIONS.md).
