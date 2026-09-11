# Architecture

Maritime Ops is a self-hosted maritime tracking + marine weather platform.

## High-level data flow

```
[AISstream.io WS] ─────┐
[AISHub REST] ─────────┤
[Local NMEA UDP/TCP] ──┼──> [Ingestion Service] ──> Redis cache ──> WebSocket Hub ──> Web/PWA
                       │        │
                       │        └──> PostgreSQL + TimescaleDB ──> REST API (Fastify)
                       │
[Open-Meteo] ─────────────────> Weather Service ──> MapLibre overlays
[NOAA GFS]   ─────────────────> Weather Service
```

## Components

### Backend (`backend/`)
- **HTTP API** – Fastify, mounted under `/api/v1`. OpenAPI docs via `@fastify/swagger`.
- **WebSocket hub** – `/ws/positions`. Broadcasts live positions; clients subscribe
  to a bounding-box room so they only receive vessels in their viewport.
- **AIS ingestion** – `ais-ingestion.service.ts` connects to AISstream.io and writes
  each position to Redis (last-known) + PostgreSQL hypertable + a Redis Stream for
  the WebSocket hub. AISHub HTTP polling and local NMEA receivers are optional.
- **Weather service** – proxies Open-Meteo Marine + NOAA GFS with server-side
  caching in the `weather_cache` table (TTL 1h).
- **Voyage service** – reconstructs routes from the hypertable, computes
  distance/speed/ETA, detects port stops, builds voyage reports.
- **Alert service** – evaluates `alert_rules` (speed, zone entry/exit, long stop,
  route deviation) against live positions and raises `alerts`.
- **Export service** – CSV/GeoJSON/KML/PDF exporters.
- **Workers** – `ais-stream.worker.ts` (live ingestion loop),
  `weather-cache.worker.ts` (prefetch), `demo.ts` (synthetic AIS when no key).

### Database
PostgreSQL 16 + PostGIS + TimescaleDB.
- `vessels` – static registry.
- `vessel_positions` – hypertable, 1-day chunks, compressed after 7 days.
- `voyages`, `weather_cache`, `fleet_groups`, `fleet_vessels`, `alert_rules`,
  `alerts`, `push_subscriptions`, `users`.

### Frontend (`frontend/`)
React 18 + Vite + MapLibre GL JS, installed as a PWA.
- **MapView** – base layer + vessel + weather + route + density layers.
- **Hooks** – `useAISWebSocket`, `useVesselPositions`, `useWeatherData`.
- **Stores** – `fleetStore` (Zustand).
- **Service Worker** – Workbox runtime caching (offline + weather cache 30 min).

### Deployment
`docker compose up` starts postgres, redis, backend, frontend.
Caddy/Nginx is recommended in production for automatic TLS.

## Performance model
- Redis last-known position TTL 10 min.
- WebSocket hub per bounding-box room; only in-viewport vessels broadcast.
- TimescaleDB compression after 7 days keeps years of history cheap.
- MapLibre clustering for 5 000+ vessels.
- Weather cached server-side (1h) + client SW (30 min).

## Security
JWT (admin/viewer), Zod validation, rate limiting (100 req/min/IP), configurable
CORS, HTTPS in production, env-var secrets, Web Push via VAPID.
