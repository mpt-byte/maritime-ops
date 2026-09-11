-- ═══════════════════════════════════════════════════════════════════════════════
-- Maritime Ops - Database schema (PostgreSQL 16 + PostGIS + TimescaleDB)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ──────────────────────────────────────────────────────────────────────────────
-- vessels: vessel static / registry data
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vessels (
    mmsi          INTEGER PRIMARY KEY,
    imo           INTEGER UNIQUE,
    name          VARCHAR(255),
    callsign      VARCHAR(64),
    ship_type     INTEGER,
    flag          VARCHAR(3),
    length        REAL,
    width         REAL,
    draught       REAL,
    gross_tonnage INTEGER,
    photo_url     TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vessels_name_trgm ON vessels USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vessels_callsign ON vessels (callsign);
CREATE INDEX IF NOT EXISTS idx_vessels_imo ON vessels (imo);
CREATE INDEX IF NOT EXISTS idx_vessels_ship_type ON vessels (ship_type);

-- ──────────────────────────────────────────────────────────────────────────────
-- vessel_positions: hypertable (TimescaleDB) - time-series of AIS positions
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vessel_positions (
    mmsi        INTEGER NOT NULL,
    timestamp   TIMESTAMPTZ NOT NULL,
    location    GEOGRAPHY(POINT, 4326) NOT NULL,
    sog         REAL,
    cog         REAL,
    heading     REAL,
    nav_status  INTEGER,
    draught     REAL,
    destination VARCHAR(255),
    eta         TIMESTAMPTZ,
    source      VARCHAR(32) DEFAULT 'aisstream'
);

SELECT create_hypertable('vessel_positions', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_positions_mmsi_time
    ON vessel_positions (mmsi, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_positions_geo
    ON vessel_positions USING GIST (location);

-- Compression policy: compress chunks older than 7 days into columnar form.
ALTER TABLE vessel_positions SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'mmsi',
    timescaledb.compress_orderby = 'timestamp DESC'
);
SELECT add_compression_policy('vessel_positions', INTERVAL '7 days', if_not_exists => TRUE);

-- Continuous aggregates are intentionally left to runtime migrations; the base
-- hypertable above is enough for playback / route reconstruction.

-- ──────────────────────────────────────────────────────────────────────────────
-- voyages: detected / annotated voyages between ports
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS voyages (
    id              SERIAL PRIMARY KEY,
    mmsi            INTEGER NOT NULL REFERENCES vessels(mmsi) ON DELETE CASCADE,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ,
    start_port      VARCHAR(255),
    end_port        VARCHAR(255),
    distance_nm     REAL,
    avg_speed       REAL,
    max_speed       REAL,
    min_speed       REAL,
    duration_hours  REAL,
    status          VARCHAR(32) DEFAULT 'active',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voyages_mmsi ON voyages (mmsi, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_voyages_status ON voyages (status);

-- ──────────────────────────────────────────────────────────────────────────────
-- weather_cache: server-side cache for point weather queries
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weather_cache (
    id            SERIAL PRIMARY KEY,
    location      GEOGRAPHY(POINT, 4326) NOT NULL,
    timestamp     TIMESTAMPTZ NOT NULL,
    model         VARCHAR(32),
    wind_speed    REAL,
    wind_dir      REAL,
    wave_height   REAL,
    wave_period   REAL,
    wave_dir      REAL,
    pressure      REAL,
    air_temp      REAL,
    sea_temp      REAL,
    precipitation  REAL,
    visibility    REAL,
    cloud_cover   REAL,
    humidity      REAL,
    UNIQUE (location, timestamp, model)
);

CREATE INDEX IF NOT EXISTS idx_weather_geo ON weather_cache USING GIST (location);

-- ──────────────────────────────────────────────────────────────────────────────
-- fleet_groups / fleet_vessels: fleet management
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fleet_groups (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    color       VARCHAR(7),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fleet_vessels (
    group_id    INTEGER REFERENCES fleet_groups(id) ON DELETE CASCADE,
    mmsi        INTEGER REFERENCES vessels(mmsi) ON DELETE CASCADE,
    added_at    TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (group_id, mmsi)
);

-- ──────────────────────────────────────────────────────────────────────────────
-- alert_rules + alerts: alerting engine
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alert_rules (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    alert_type   VARCHAR(64) NOT NULL,
    mmsi         INTEGER REFERENCES vessels(mmsi) ON DELETE CASCADE,
    group_id     INTEGER REFERENCES fleet_groups(id) ON DELETE CASCADE,
    config       JSONB NOT NULL DEFAULT '{}',
    severity     VARCHAR(16) DEFAULT 'info',
    enabled      BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    mmsi            INTEGER REFERENCES vessels(mmsi) ON DELETE CASCADE,
    rule_id         INTEGER REFERENCES alert_rules(id) ON DELETE SET NULL,
    alert_type      VARCHAR(64) NOT NULL,
    severity        VARCHAR(16) DEFAULT 'info',
    message         TEXT,
    location        GEOGRAPHY(POINT, 4326),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by  VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_mmsi ON alerts (mmsi);
CREATE INDEX IF NOT EXISTS idx_alerts_geo ON alerts USING GIST (location);

-- ──────────────────────────────────────────────────────────────────────────────
-- push_subscriptions: Web Push endpoints per user
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id           SERIAL PRIMARY KEY,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh_key   TEXT NOT NULL,
    auth_key     TEXT NOT NULL,
    user         VARCHAR(255),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────────────────────
-- users: minimal JWT auth (admin / viewer)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           SERIAL PRIMARY KEY,
    username     VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role         VARCHAR(16) NOT NULL DEFAULT 'viewer',
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
