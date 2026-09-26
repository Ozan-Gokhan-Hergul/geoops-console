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

## 2026-09-27 — Milestone 4: Cloudflare Workers deployment compatibility

Supersedes the VPS-reverse-proxy sketch above: the actual target is a
**separate** Cloudflare Workers deployment (`geoops.ozanhergul.com.tr`),
alongside — not replacing — the existing `ozanhergul.com.tr` Workers Static
Assets site, which this milestone does not touch. (The user provisioned and
deployed the Worker themselves after this compatibility work; see the
follow-up entry below for the post-deploy observability/documentation pass.)

- **Fastify is not used on Workers — verified, not assumed.** Cloudflare's
  own blog post on Node.js compatibility improvements states: "it is now
  possible to use both Express and Koa within Workers, and we're hoping to
  be able to add Fastify support later"
  ([source](https://blog.cloudflare.com/nodejs-workers-2025/)). Workers also
  have no listening socket for `.listen()` — the entry point is a
  `fetch(request, env, ctx)` function. Rather than force Fastify in via an
  unsupported/undocumented path, `worker/index.ts` is a small (~100-line)
  native adapter.
- **Reused, not rewritten**: `worker/index.ts` imports `src/schema.ts`,
  `src/enrichService.ts`, `src/osm/*`, `src/cache.ts`, and
  `src/concurrencyLimiter.ts` directly. All of them turned out to already
  use only Web-standard APIs (`fetch`, `AbortController`, `Promise`, `Map`)
  with zero Node-specific calls — **except** `src/config.ts`, which read
  `process.env.OVERPASS_URL` at module load. Fixed with the smallest
  possible change: a `globalThis`-cast guard
  (`(globalThis as {process?...}).process?.env?.OVERPASS_URL`) instead of a
  bare `process.env` reference, so the same file type-checks and runs
  identically under Node and under a Worker with no `nodejs_compat` flag.
  Behavior under Node is unchanged (same env var, same default).
- **No `nodejs_compat` flag**: not needed, since nothing the Worker imports
  requires Node builtins. Keeps the bundle smaller and avoids polyfill
  overhead — deliberately conservative against the Free plan's 10ms
  CPU/request and 64MiB script-size limits (both confirmed via Cloudflare's
  limits page, not assumed).
- **In-memory cache, concurrency limiter, and rate limiter are reused
  as-is, but re-scoped honestly**: they are plain `Map`/counter-based state
  at module scope, which Workers keeps alive only for the lifetime of
  whichever single isolate holds it — Cloudflare may run many isolates for
  this Worker concurrently worldwide and recycle any of them anytime. This
  is a best-effort, per-isolate optimization, not a distributed cache or a
  real rate limit (the Node deployment's own "per-process" limiter has the
  same shape of caveat, just usually one long-lived process instead of many
  short-lived isolates — Workers is weaker on this axis, not equivalent).
  For a low-traffic public demo this is judged acceptable: it still caps
  each isolate's own concurrency toward Overpass, still caches repeated
  identical lookaround queries for 10 minutes, and sits underneath
  Cloudflare's own platform-level Free-tier limits (100k requests/day, 50
  subrequests/request) as an outer bound regardless. Added a small
  `worker/rateLimiter.ts` (fixed-window, per-IP, per-isolate) purely so
  inbound abuse isn't entirely unbounded at the app layer; explicitly not
  presented as a real distributed rate limit. A real fix — Cloudflare's own
  Rate Limiting rules, KV, or Durable Objects — is named as the upgrade
  path, not implemented (new infra, out of scope for this milestone).
- **No CORS added**: Workers Static Assets serves `frontend/dist` and the
  Worker script from the same origin; `/api/*` falls through to the Worker
  automatically when no static asset matches (confirmed via Cloudflare's
  static-assets routing docs: "If an appropriate static asset is not found,
  Cloudflare will invoke your Worker script") — no `run_worker_first` config
  needed since `/api/*` never matches a built file. The frontend already
  defaults to relative URLs (`VITE_API_BASE_URL` unset), so zero frontend
  changes were needed either.
- **Preserved the Overpass User-Agent/Referer headers and request encoding**
  from `src/osm/overpass.ts` exactly as-is (reused unmodified); no endpoint
  rotation or retry logic was added.
- **Verified locally, not just unit-tested**: beyond the 8 new
  `test/worker.test.ts` cases (run under Node/Vitest against the handler
  function directly), also ran `wrangler dev` against the real local
  Workers runtime (workerd) and confirmed via `curl`: `/health` 200, a
  static asset (`/`) 200, `/api/enrich` 400 on invalid input, 405 on wrong
  method, 404 on an unknown path, and a **real live request to the public
  Overpass API returning genuine Sultanahmet POIs** — plus a near-instant
  repeat request confirming the per-isolate cache hit. No deployment,
  provisioning, or Cloudflare account authentication was needed or
  performed for any of this; `wrangler dev`'s default local mode requires
  neither.
- **Manual steps that remained** (done by the user, not by the assistant):
  `wrangler login` under their own Cloudflare account; `wrangler deploy` to
  create the new, separate Worker; the `geoops.ozanhergul.com.tr` DNS
  record/route. Completed — see the follow-up entry below.

## 2026-09-27 — Post-deploy: observability, docs, and portfolio material

`geoops.ozanhergul.com.tr` is live (user-confirmed: HTTPS, mobile layout,
real POI enrichment). This entry covers the documentation/observability
finalization pass done afterward — no application code changed.

- **Observability**: added `[observability]` / `[observability.logs]` /
  `[observability.traces]` to `wrangler.toml`, enabling Workers Logs
  (`invocation_logs = true`) and explicitly leaving tracing off, per the
  user's instruction. Verified the exact field names/shape against the
  **installed** Wrangler's own `node_modules/wrangler/config-schema.json`
  (not just documentation prose, which under-described the nested
  `logs`/`traces` tables) — confirms compatibility with Wrangler 4.141.0.
  No external monitoring/APM service added; no paid feature enabled
  (Workers Logs is free on both Free and Paid plans, per the same schema
  file's adjacent docs and Cloudflare's pricing page). `worker/index.ts`
  has no `console.log` calls, so invocation logs capture only the
  platform's own automatic metadata (method/path/status/duration/CPU) —
  never request bodies, coordinates, PII, credentials, or Overpass
  response bodies.
- **Validated without deploying**: `wrangler deploy --dry-run` compiles the
  Worker + reads the assets directory and reports upload size without
  uploading — used to confirm the new `wrangler.toml` is valid, with no
  Cloudflare authentication needed or performed.
- **Docs updated to describe the live system, not a plan**: README's
  Cloudflare section reframed from "experimental"/local-only to describing
  the actual production deployment, HTTPS, and where to view logs;
  `PROJECT_BRIEF.md`'s Milestone 4 marked done (merging what were
  previously split "4A/4B" entries, since the deploy actually happened). No
  performance numbers, uptime figures, or traffic statistics were invented
  anywhere — none exist yet to report.
- **Portfolio case study**: added `docs/PORTFOLIO_CASE_STUDY.md` with
  ready-to-use copy for the personal site. The personal website's source
  (`D:\OzanHergulWS\website`) was inspected read-only (a single static
  `index.html`/`styles.css`, no framework, no existing "Projects" section —
  see its own `CLAUDE.md` for its constraints: static Cloudflare Pages
  hosting, no backend, minimal dependencies). Proposed the smallest
  consistent integration — a new `<section id="projects">` between the
  existing `#services` and `#experience` sections, one card, matching the
  existing `.service-card` markup pattern — but did **not** write to or
  modify any file in that project, per the explicit-approval boundary.
