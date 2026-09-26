<!--
Ready-to-use copy for the personal website (ozanhergul.com.tr). Everything
between the two "COPY START"/"COPY END" markers is written to be pasted
in more or less as-is. Integration notes for the website itself are at the
bottom of this file, below the copy block.
-->

<!-- COPY START -->

# GeoOps Console

Pick a point on a map and get back the nearest real-world points of
interest around it — enriched live from OpenStreetMap, with the same
enrichment logic running unchanged on two different backends: a local
Node.js/Fastify API and a native Cloudflare Worker in production.

**Live demo:** [geoops.ozanhergul.com.tr](https://geoops.ozanhergul.com.tr/)
**Source:** [github.com/Ozan-Gokhan-Hergul/geoops-console](https://github.com/Ozan-Gokhan-Hergul/geoops-console)

![Search results near Sultanahmet: map markers and a result list showing category, name, and distance for the three nearest points of interest](screenshots/search-results.png)

## The problem

Wrapping a public, best-effort third-party API (OpenStreetMap's Overpass
API) into a small, safe, production-shaped service — one that validates
input rigorously, never lets a client craft an arbitrary upstream query,
handles the upstream's real-world messiness (points vs. areas, missing
names, outages) explicitly instead of assuming happy paths, and is
deployable on more than one kind of runtime without duplicating its core
logic.

## Architecture

- **Frontend**: Vite + vanilla TypeScript + Leaflet. No framework — the UI
  (a map, a form, a result list) is small enough not to need one.
- **Shared enrichment core**: validation (zod), Overpass query building,
  response normalization/ranking, an in-memory TTL cache, and an outbound
  concurrency limiter — all plain TypeScript using only Web-standard APIs
  (`fetch`, `AbortController`, `Promise`, `Map`). No framework dependency.
- **Two HTTP layers on top of the same core, unchanged**:
  - **Locally**: Node.js + Fastify, for day-to-day development.
  - **In production**: a small native Cloudflare Worker adapter, because
    Cloudflare does not currently support running Fastify on Workers
    (verified against Cloudflare's own documentation, not assumed) —
    Workers have no listening socket for `.listen()` to bind to; the
    entry point is a `fetch(request)` function. Rather than force an
    unsupported framework onto an incompatible runtime, the ~100-line
    adapter reuses the exact same validation/query/cache/normalization
    modules the Fastify backend uses.

## Key engineering decisions

- **Validation and query safety**: every request is validated (coordinate
  ranges, a capped search radius, a fixed category enum) before any
  Overpass query is built. Queries are assembled server-side from a fixed
  category → OSM tag mapping — a client can never inject arbitrary Overpass
  syntax.
- **Caching and concurrency**: identical (coordinate, radius, categories)
  lookups are cached for 10 minutes, and outbound calls to the public
  Overpass API are capped at a small fixed concurrency, to be a good
  citizen of a shared, best-effort public resource. In the Cloudflare
  deployment, this state is explicitly scoped to a single Worker isolate —
  documented as a best-effort, per-isolate optimization, never presented as
  a distributed cache or a guaranteed rate limit.
- **Approximate OSM geometry, handled honestly**: a point of interest in
  OpenStreetMap can be a node, a way, or a relation. Ways/relations only
  return a centroid, not their true shape, so those results are explicitly
  flagged `approximate: true` in the API and labeled "approximate centroid"
  in the UI — never silently presented as exact.
- **XSS prevention**: OSM-supplied names are untrusted, user-editable text.
  All rendering — the result list and map popups — builds DOM nodes with
  `textContent`, never `innerHTML` with interpolated OSM data, so a
  malicious place name can never be interpreted as markup.
- **Stale-response protection**: a small version-guard on the frontend
  discards an in-flight API response if the user changed the selected
  location, radius, or categories before it returned — preventing a slow,
  superseded request from overwriting what the user is currently looking
  at.
- **Test coverage**: unit and integration tests on both the backend
  (validation, node/way/relation normalization, ranking, cache-key
  correctness, error handling — all against mocked Overpass responses, no
  network access needed) and the frontend (pure request-building and
  formatting logic), plus a dedicated suite for the Cloudflare Worker
  adapter's routing and error mapping.

<!-- COPY END -->

---

## Integration notes (not for direct publication — read before wiring in)

**Website source inspected** at `D:\OzanHergulWS\website` (read-only; no
files there were changed). Findings:

- It's a single static page: `index.html` + `styles.css`, no framework, no
  build step, no content-collection/CMS pattern to slot into. Hosted on
  Cloudflare (per its own `CLAUDE.md`): static hosting, no backend, minimal
  dependencies, mobile-first.
- Current sections in order: `#hero` → `#services` (a grid of
  `.service-card` divs, one of which is literally *"Geospatial Applications
  & Data Visualization... using Leaflet"*) → `#experience` → `#contact`.
  There is **no existing "Projects"/"Portfolio"/"Case Studies" section**.

**Smallest consistent integration** (proposed, not implemented): add one
new section between `#services` and `#experience`:

```html
<section id="projects" class="projects">
  <div class="wrap">
    <h2>Selected Projects</h2>
    <div class="project-card">
      <!-- paste the "COPY START"..."COPY END" block's content here,
           adapting headings to <h3> to match the existing hierarchy -->
    </div>
  </div>
</section>
```

This mirrors the existing `.services`/`.service-card` markup pattern
exactly (same `<section><div class="wrap"><h2>` shape), so it should be
stylable with a `.project-card` rule that's a close variant of the existing
`.service-card` CSS rather than new design language. The screenshot would
need copying to the website's own `assets/` directory (its image host is
separate from this repo).

This integration was **not implemented** — the task boundary was explicit
that the personal website must not be changed or deployed without your
separate approval. Say the word and it's a small, contained change.
