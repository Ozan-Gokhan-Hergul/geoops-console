# GeoOps Console

A small location-enrichment backend demo. Given a coordinate, it queries the
public [OpenStreetMap Overpass API](https://overpass-api.de/) for nearby
points of interest (pharmacy, bank, dentist, supermarket, convenience) and
returns the three closest matches with normalized fields and distances.

This is a portfolio demo. It uses only public OpenStreetMap data — no
proprietary datasets, credentials, or business logic.

## Requirements

- Node.js 20+
- Docker (optional, for containerized local dev)

## Local setup

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

## Example request

```bash
curl -X POST http://localhost:3000/api/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 52.5200,
    "longitude": 13.4050,
    "radiusMeters": 200,
    "categories": ["pharmacy", "supermarket"]
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
      "latitude": 52.5201,
      "longitude": 13.4052,
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
- Requests to `/api/enrich` are rate-limited (20 requests/minute by default)
  and Overpass calls have an 8-second timeout.

## Limitations

- **Overpass is a best-effort public dependency.** There is no guaranteed
  quota, uptime SLA, or response-time guarantee from the public
  `overpass-api.de` instance. Upstream failures surface as `502
  upstream_unavailable` rather than crashing the service.
- The in-memory cache and rate limiter are per-process and reset on restart —
  fine for a single-instance demo, not for horizontal scaling.
- Way/relation coordinates and distances are centroid-based approximations,
  not true nearest-edge distances.
- No database, authentication, or frontend — this milestone is the enrichment
  API only.

## Attribution

Point-of-interest data © [OpenStreetMap](https://www.openstreetmap.org/copyright)
contributors, made available under the Open Database License (ODbL).
