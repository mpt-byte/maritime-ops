-- Maritime Ops - first migration (idempotent extensions + continuous aggregate stub)
-- Applies on top of schema.sql for existing databases that were created before
-- this migration existed.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
