# Contributing to Maritime Ops

Thanks for your interest! Maritime Ops is open source (MIT) and all contributions are welcome.

## Quick start

```bash
git clone <repo-url>
cd maritime-ops
cp .env.example .env          # fill in free AISstream / Open-Meteo keys
docker compose up --build
```

Frontend dev (with hot reload): `cd frontend && npm i && npm run dev`
Backend dev: `cd backend && npm i && npm run dev`

## Project layout

```
backend/   Fastify + TypeScript API, AIS ingestion, WebSocket hub, workers
frontend/  React 18 + Vite + MapLibre GL JS PWA
docker/    Postgres bootstrap + Dockerfiles
docs/      Architecture and API docs
```

## Conventions

- TypeScript strict mode everywhere.
- No new dependencies unless strictly necessary; prefer the existing stack.
- Validate all inputs with Zod (`backend/src/schemas`).
- Do not commit secrets or `.env`.
- Keep PRs focused; one feature / fix per PR.
- Run lint, typecheck, tests, and build before pushing.

## Database migrations

- Schema lives in `backend/src/database/schema.sql` (loaded on first container init).
- Additive migrations go in `backend/src/database/migrations/NNNN_name.sql`.
- All SQL must be idempotent (`IF NOT EXISTS` / `ON CONFLICT`).

## Commit style

Use conventional commits:

```
feat: add wind particle layer
fix: correct ETA computation in voyage service
docs: update deployment guide
chore: bump dependencies
```

## Tests

- Unit tests: Vitest (`*.test.ts`).
- Place test files next to the module they cover.
- Run: `npm test` in `backend/` or `frontend/`.

## Reporting security issues

Do not open a public issue. Email the maintainers or open a private
security advisory on GitHub.
