# GeoOps Console

Public portfolio demo of backend/geospatial/data-engineering skills. Synthetic
and public data only — never copy code, credentials, datasets or business
logic from the user's employer.

## Working principles

- One small milestone at a time. No speculative features or premature abstractions.
- Simple, maintainable code; lightweight dependencies.
- Ask before major architectural decisions, destructive actions, paid services,
  or creating cloud resources.
- Do not modify the user's existing WireGuard setup or remote server.
- See `PROJECT_BRIEF.md` for scope/roadmap and `DECISIONS.md` for the log of
  decisions that matter.

## Stack

- **Backend (Milestone 1)**: Node.js LTS + TypeScript, Fastify,
  Docker/Docker Compose. No database, auth, Redis, queue, or microservices.
- **Frontend (Milestone 2)**: Vite + vanilla TypeScript + Leaflet, in
  `frontend/` as an independent project. No React/Angular, no new backend
  architecture — talks to the existing `/api/enrich` via a Vite dev proxy.

## Commands

Backend (repo root):

```bash
npm run build   # tsc
npm test        # vitest run
npm run dev     # tsx watch src/server.ts
```

Frontend (`frontend/`):

```bash
npm run dev     # Vite dev server on :5173, proxies /api to :3000
npm run build   # tsc --noEmit + vite build
npm test        # vitest run
```
