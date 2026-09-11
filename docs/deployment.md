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

## Production with TLS (Caddy)

Example Caddyfile (place behind the frontend):

```
maritime.example.com {
    reverse_proxy frontend:80
}
api.maritime.example.com {
    reverse_proxy backend:4000
}
```

In `docker-compose.yml` add a `caddy` service using `caddy:2-alpine` and mount
your `Caddyfile`. Set `PUBLIC_BASE_URL=https://maritime.example.com`.

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
