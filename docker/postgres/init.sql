-- Maritime Ops - PostgreSQL bootstrap (extensions)
-- Runs on first container init only.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
