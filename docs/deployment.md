# Deployment guide

## Single-command local deployment

```bash
cp .env.example .env
docker compose up --build
```

Services:
- Frontend/PWA: http://localhost:3000
- API:         http://localhost:4000/api/v1
- Swagger:     http://localhost:4000/api/v1/docs

## Production with TLS (Caddy) — one host

A ready `docker-compose.prod.yml` + `Caddyfile` ship in the repo root. One
Caddy terminates TLS and routes everything on a single origin:

- `/api/v1/*` and `/ws/*` → backend (`backend:4000`)
- everything else → frontend nginx (`frontend:80`, static PWA + SPA fallback)

The frontend is built with `VITE_API_BASE=/api/v1` and `VITE_WS_BASE=/ws`, so all
calls are same-origin (no CORS needed).

```bash
cp .env.example .env
# In .env set at least:
#   PUBLIC_DOMAIN=maritime.example.com
#   AISSTREAM_API_KEY=...          (free, for live AIS)
#   JWT_SECRET=...                  (long random string)
#   ADMIN_PASSWORD=...
#   POSTGRES_PASSWORD=...
docker compose -f docker-compose.prod.yml up --build -d
```

Point your domain's DNS A/AAAA record at the host. On a real domain Caddy
obtains Let's Encrypt TLS automatically on first request. With
`PUBLIC_DOMAIN=localhost` Caddy serves plain HTTP on `:80` (handy for LAN tests).

Verify:
```bash
curl https://maritime.example.com/api/v1/health   # {"status":"ok",...}
```

## Backend-only deployment (Fly.io) + GitHub Pages frontend

For a cheap full-stack demo you can split the deployment:
- **Frontend** on GitHub Pages (the `pages.yml` workflow already builds it).
- **Backend** on Fly.io (API + WebSocket + AIS/weather workers in one Machine).

Backend (`fly.toml` + `fly.backend.Dockerfile` at repo root):
```bash
fly deploy
fly secrets set JWT_SECRET=... ADMIN_PASSWORD=... AISSTREAM_API_KEY=... \
                DATABASE_URL=... REDIS_URL=... \
                PUBLIC_BASE_URL=https://maritime.fly.dev
```

Fly Postgres does **not** ship TimescaleDB/PostGIS, so run a Fly Machine with
`timescale/timescaledb-postgis:pg16-ts2.17` (or external managed Postgres), and a
small Redis Machine (or Upstash). Point `DATABASE_URL` and `REDIS_URL` at them.

Wire the Pages frontend to the Fly backend:
1. Open the demo at `https://<account>.github.io/maritime-ops/`
2. Click the **Default API** button (top toolbar, far right) → paste
   `https://maritime.fly.dev/api/v1` → **Apply & reload**.
3. The dot turns green when `/health` responds; you can now search ships by IMO
   and watch live AIS positions.

## Required free keys

1. **AISstream.io** – register at https://aishub.net/aisstream.io, copy the API
   key into `AISSTREAM_API_KEY`. Without it the platform runs in demo mode.
2. **Open-Meteo** – no key required for up to 10 000 req/day. Optionally set
   `OPEN_METEO_API_KEY` for higher limits.
3. **VAPID keys** – `npx web-push generate-vapid-keys`, fill
   `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` for Web Push.

## Backups

- Postgres: `docker exec maritime-postgres pg_dump -U maritime maritime > backup.sql`
- Restore: `docker exec -i maritime-postgres psql -U maritime maritime < backup.sql`

## Scaling notes

- Increase backend replicas behind a load balancer; WebSocket rooms must be
  shared (Redis pub/sub already isolates broadcasting).
- TimescaleDB compression keeps history cheap; tune
  `add_compression_policy` interval to your retention.
