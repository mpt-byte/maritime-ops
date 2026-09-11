import { query, withTransaction } from '../database/db.js';
import { getRedis, REDIS_KEYS, POSITION_TTL_SECONDS } from '../database/redis.js';
import type { DecodedPosition, DecodedStatic } from './ais-decode.js';
import type { VesselPosition } from '../schemas/index.js';
import type { LoggerLike } from './logger.js';

const REDIS = () => getRedis();

export interface PositionEnvelope {
  mmsi: number;
  timestamp: string;
  lat: number;
  lon: number;
  sog?: number;
  cog?: number;
  heading?: number;
  nav_status?: number;
  draught?: number;
  destination?: string;
  eta?: string;
  source?: string;
}

export async function ingestPosition(
  pos: DecodedPosition,
  source: string,
  log?: LoggerLike,
): Promise<void> {
  if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lon)) return;
  if (Math.abs(pos.lat) > 90 || Math.abs(pos.lon) > 180) return;
  if (pos.lat === 0 && pos.lon === 0) return;

  const now = new Date();
  const ts = new Date(now.getTime());
  const envelope: PositionEnvelope = {
    mmsi: pos.mmsi,
    timestamp: ts.toISOString(),
    lat: pos.lat,
    lon: pos.lon,
    sog: pos.sog,
    cog: pos.cog,
    heading: pos.heading,
    nav_status: pos.nav_status,
    source,
  };

  const redis = REDIS();
  await redis.set(REDIS_KEYS.position(pos.mmsi), JSON.stringify(envelope), 'EX', POSITION_TTL_SECONDS);
  await redis.sadd(REDIS_KEYS.positionsSet, String(pos.mmsi));
  await redis.xadd(
    REDIS_KEYS.stream,
    'MAXLEN', '~', 100_000,
    'data', JSON.stringify(envelope),
  );

  try {
    await query(
      `INSERT INTO vessel_positions
         (mmsi, timestamp, location, sog, cog, heading, nav_status, source)
       VALUES ($1, $2, ST_MakePoint($3, $4)::geography, $5, $6, $7, $8, $9)`,
      [pos.mmsi, ts.toISOString(), pos.lon, pos.lat, pos.sog ?? null, pos.cog ?? null,
       pos.heading ?? null, pos.nav_status ?? null, source],
    );
  } catch (err) {
    log?.warn({ err, mmsi: pos.mmsi }, 'failed to insert vessel_positions');
  }
}

export async function ingestStatic(
  stat: DecodedStatic,
  source: string,
  log?: LoggerLike,
): Promise<void> {
  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO vessels
           (mmsi, imo, name, callsign, ship_type, draught, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (mmsi) DO UPDATE SET
           imo        = COALESCE(EXCLUDED.imo, vessels.imo),
           name       = COALESCE(EXCLUDED.name, vessels.name),
           callsign   = COALESCE(EXCLUDED.callsign, vessels.callsign),
           ship_type  = COALESCE(EXCLUDED.ship_type, vessels.ship_type),
           draught    = COALESCE(EXCLUDED.draught, vessels.draught),
           updated_at = NOW()`,
        [
          stat.mmsi,
          stat.imo ?? null,
          stat.name ?? null,
          stat.callsign ?? null,
          stat.ship_type ?? null,
          stat.draught ?? null,
        ],
      );
      if (stat.destination || stat.eta) {
        await client.query(
          `INSERT INTO vessel_positions (mmsi, timestamp, location, destination, eta, source)
           VALUES ($1, NOW(), ST_MakePoint(0,0)::geography, $2, $3, $4)`,
          [stat.mmsi, stat.destination ?? null, stat.eta ? new Date(stat.eta).toISOString() : null, source],
        );
      }
    });
  } catch (err) {
    log?.warn({ err, mmsi: stat.mmsi }, 'failed to ingest static data');
  }
}

export async function getAllLivePositions(): Promise<PositionEnvelope[]> {
  const redis = REDIS();
  const mmsis = await redis.smembers(REDIS_KEYS.positionsSet);
  if (mmsis.length === 0) return [];
  const keys = mmsis.map((m) => REDIS_KEYS.position(Number(m)));
  const raw = await redis.mget(...keys);
  const out: PositionEnvelope[] = [];
  for (const r of raw) {
    if (!r) continue;
    try {
      out.push(JSON.parse(r) as PositionEnvelope);
    } catch {
      // ignore corrupt entries
    }
  }
  return out;
}

export async function getLivePosition(mmsi: number): Promise<PositionEnvelope | null> {
  const redis = REDIS();
  const raw = await redis.get(REDIS_KEYS.position(mmsi));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PositionEnvelope;
  } catch {
    return null;
  }
}

export function toVesselPosition(env: PositionEnvelope): VesselPosition {
  return {
    mmsi: env.mmsi,
    timestamp: env.timestamp,
    lat: env.lat,
    lon: env.lon,
    sog: env.sog,
    cog: env.cog,
    heading: env.heading,
    nav_status: env.nav_status,
    draught: env.draught,
    destination: env.destination,
    eta: env.eta,
    source: env.source,
  };
}
