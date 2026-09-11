# Maritime Ops

Open-source, self-hosted maritime tracking & marine weather platform combining
**MarineTraffic-style AIS vessel tracking** with **Windy-style weather overlays**.

Built entirely on free / community data sources (AISstream.io, AISHub, Open-Meteo,
NOAA GFS) and a permissive **MIT** stack. No recurring licence fees: typical
infrastructure cost is ~50-200 EUR/month vs. >16 400 EUR/year for the commercial
equivalent.

![architecture](docs/architecture.md)

---

## Features

| Module | Highlights |
|--------|-----------|
| **1. Real-time tracking** | AISstream.io WebSocket, AISHub HTTP, local NMEA receiver, live MapLibre map, filters (type/flag/destination/status/area), MMSI/IMO/name search, vessel details, fleet lists, alerts, Web Push |
| **2. Route tracing** | Continuous TimescaleDB recording, route reconstruction, distance/avg-speed/transit-time, linear ETA forecast, planned-vs-actual, speed/time colouring, GeoJSON/KML/CSV export |
| **3. Voyage analysis** | Interactive playback + timeline, period selection, 1x/2x/5x/10x speed, weather overlay on playback, port-call detection (stop >2h), voyage report, PDF/CSV/GeoJSON export, traffic density heatmap |
| **4. Marine weather** | Open-Meteo Marine + NOAA GFS, MapLibre overlays (wind particles, isobars, rasters), model selection (ECMWF/GFS/ICON/gfsWave), wind/waves/pressure/SST/precip/cloud/humidity/visibility, point forecast, multi-model compare, weather timeline synced with playback |
| **5. Fleet management** | Fleet dashboard, real-time status (at sea/port/stopped/moving), indicators, per-vessel/group alerts, CSV/JSON/GeoJSON export, alert history, fleet stats |
| **6. PWA mobile** | Installable on iOS/Android + desktop, offline cache, native push, touch map, vessel list with sort/filter, mobile-optimised detail view |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Map | MapLibre GL JS (free vector tiles) |
| Backend | Node.js 20 + Fastify + TypeScript |
| Database | PostgreSQL 16 + PostGIS + TimescaleDB |
| Cache / pub-sub | Redis 7 |
| Messaging | Redis Streams |
| Containers | Docker + Docker Compose |
| PWA | Service Worker + Workbox |

---

## Quick start (5 minutes)

```bash
git clone <repo-url> maritime-ops
cd maritime-ops
cp .env.example .env
# Optional: add a free AISstream.io API key for live AIS
#   AISSTREAM_API_KEY=...   (https://aishub.net/aisstream.io)
docker compose up --build
```

- Frontend (PWA): http://localhost:3000
- API:          http://localhost:4000/api/v1
- Health:       http://localhost:4000/api/v1/health

Without an AIS key the platform still runs in **demo mode** using a built-in
synthetic AIS generator so the map is never empty (see `demo.ts` worker).

---

## Configuration

All configuration is via environment variables (see `.env.example`). Key groups:

- **DB / Redis** – `DATABASE_URL`, `REDIS_URL`
- **AIS sources** – `AISSTREAM_API_KEY`, `AISHUB_API_KEY`, `NMEA_ENABLED`
- **Weather** – `OPEN_METEO_BASE_URL`, `OPEN_METEO_CACHE_TTL_MS`
- **Auth** – `JWT_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- **PWA push** – `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- **Frontend** – `VITE_API_BASE`, `VITE_WS_BASE`, `VITE_MAP_TILE_URL`

---

## Project structure

```
maritime-ops/
├── docker-compose.yml
├── .env.example
├── backend/        Fastify API + ingestion + workers
│   └── src/{config,services,routes,websocket,workers,database,schemas,plugins}
├── frontend/       React + Vite + MapLibre PWA
│   └── src/{components,hooks,stores,types,utils}
├── docker/         Postgres init
└── docs/           Architecture & API docs
```

---

## API

REST API is documented with OpenAPI/Swagger at
`http://localhost:4000/api/v1/docs` (served by `@fastify/swagger`).

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/health` | Liveness |
| GET | `/api/v1/vessels` | List vessels (pagination, filters) |
| GET | `/api/v1/vessels/:mmsi` | Vessel details |
| GET | `/api/v1/vessels/:mmsi/positions` | Historical positions |
| GET | `/api/v1/vessels/:mmsi/voyages` | Voyages for a vessel |
| GET | `/api/v1/vessels/:mmsi/voyages/:id` | Voyage detail |
| GET | `/api/v1/vessels/:mmsi/voyages/:id/report` | Voyage report (JSON/PDF) |
| GET | `/api/v1/fleet` | Fleet vessels |
| POST | `/api/v1/fleet/groups` | Create fleet group |
| POST | `/api/v1/fleet/groups/:id/vessels` | Add vessel to group |
| GET | `/api/v1/alerts` | Alerts |
| POST | `/api/v1/alerts/rules` | Create alert rule |
| GET | `/api/v1/weather/point` | Point forecast |
| GET | `/api/v1/weather/layers` | Available layers per model |
| GET | `/api/v1/weather/forecast` | Multi-model point forecast |
| GET | `/api/v1/weather/route` | Weather along a route |
| GET | `/api/v1/export/vessels.csv` | CSV export |
| GET | `/api/v1/export/voyages/:id.geojson` | GeoJSON export |
| GET | `/api/v1/export/density.geojson` | Traffic density |
| WS  | `/ws/positions` | Real-time position stream |

---

## Development

```bash
# Backend
cd backend && npm i && npm run dev      # http://localhost:4000
# Frontend
cd frontend && npm i && npm run dev     # http://localhost:5173
```

Run checks:

```bash
( cd backend && npm run lint && npm run typecheck && npm test && npm run build )
( cd frontend && npm run lint && npm run typecheck && npm test && npm run build )
```

---

## Data sources (all free / community)

**AIS**: AISstream.io (WebSocket), AISHub.net (REST, NMEA exchange), OpenAIS,
local NMEA receiver (UDP/TCP), Norwegian Coastal Administration stream.

**Weather**: Open-Meteo Marine API, NOAA GFS, OpenWeatherMap (freemium),
EMODnet bathymetry (WMS/WFS).

---

## Performance & limits

- AIS latency < 2s end-to-end; Redis cache TTL 10 min per MMSI.
- TimescaleDB 1-day chunks, compression after 7 days.
- Weather cached server-side (1h) and client-side via Service Worker (30 min).
- Map supports 5 000+ simultaneous vessels via clustering.
- WebSocket hub partitions by bounding-box rooms.
- REST rate limit 100 req/min/IP.

---

## Security

JWT auth (admin/viewer), Zod input validation, configurable CORS,
rate limiting, env-var secrets, HTTPS via Caddy in production.

---

## Licence

MIT — see [LICENSE](LICENSE). Contributions welcome, see
[CONTRIBUTING.md](CONTRIBUTING.md).
