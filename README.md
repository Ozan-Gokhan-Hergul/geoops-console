# GeoOps Console

A small location-enrichment demo. Given a coordinate, the backend queries the
public [OpenStreetMap Overpass API](https://overpass-api.de/) for nearby
points of interest (pharmacy, bank, dentist, supermarket, convenience) and
returns the three closest matches with normalized fields and distances. A
minimal map-based frontend (Vite + vanilla TypeScript + Leaflet) lets you
pick a point on the map and run searches interactively.

This is a portfolio demo. It uses only public OpenStreetMap data — no
proprietary datasets, credentials, or business logic.

## Requirements

- Node.js 20+
- Docker (optional, for containerized local backend dev)

## Backend setup

```bash
npm install
npm run build
npm test
npm run dev   # starts the API on http://localhost:3000 with hot reload
```

Or with Docker:

```bash
docker compose up --build
```

## Frontend setup

The frontend is a separate project in [`frontend/`](frontend). With the
backend running on `http://localhost:3000` (see above):

```bash
cd frontend
npm install
npm run dev   # opens the UI on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:3000`
(configured in `frontend/vite.config.ts`), so the browser only ever talks to
its own origin — no CORS setup or API key needed. To point the built
frontend at a different backend origin, set `VITE_API_BASE_URL` at build
time (`frontend/.env` or the shell environment); by default it uses relative
URLs.

Click the map to select a location, adjust the radius/categories, and press
**Search**. Other useful commands:

```bash
npm run build    # type-check + production build to frontend/dist
npm test         # unit tests for the request/formatting logic
```

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

`categories` is optional; omitting it searches all five supported categories.
`radiusMeters` defaults to 50 and is capped at 1000.

## How it works

- Requests are validated (coordinate ranges, radius cap, category enum) before
  any Overpass query is built.
- Overpass QL queries are assembled server-side from a fixed category → OSM
  tag mapping (`amenity=pharmacy`, `shop=supermarket`, etc.). The client can
  never inject arbitrary Overpass syntax.
- Nodes, ways and relations are all queried (`out center;`), since a POI can
  be mapped as any of the three. Ways/relations only carry a centroid, not
  their true shape, so those results are marked `"approximate": true`.
- Results are deduplicated, sorted by distance, and the closest three are
  returned.
- Responses are cached in-memory for 10 minutes per (coordinate, radius,
  categories) key to reduce load on the public Overpass instance.
- Requests to `/api/enrich` are rate-limited (20 requests/minute by default);
  this protects the service from inbound abuse and is separate from outbound
  politeness towards Overpass. Outbound Overpass calls are additionally capped
  at 2 concurrent requests application-wide, and each call has an 8-second
  timeout.

## Limitations

- **Overpass is a best-effort public dependency.** There is no guaranteed
  quota, uptime SLA, or response-time guarantee from the public
  `overpass-api.de` instance. Upstream failures surface as `502
  upstream_unavailable` rather than crashing the service.
- The in-memory cache and rate limiter are per-process and reset on restart —
  fine for a single-instance demo, not for horizontal scaling.
- Way/relation coordinates and distances are centroid-based approximations,
  not true nearest-edge distances (the frontend marks these as "approximate
  centroid" in both the map markers and the result list).
- No database, authentication, deployment or CORS configuration — the
  frontend's dev proxy only covers local Vite development. No auto-retry
  against Overpass; if it's unavailable, the UI surfaces that and waits for
  you to press Search again.

## Attribution

Point-of-interest data © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors, made available under the Open Database License (ODbL).
