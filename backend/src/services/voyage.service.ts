import { query } from '../database/db.js';
import type { LoggerLike } from './logger.js';

export interface PositionRow {
  timestamp: string;
  lat: number;
  lon: number;
  sog?: number;
  cog?: number;
  heading?: number;
  nav_status?: number;
}

const EARTH_R_NM = 3440.065;

export function haversineNm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function getPositions(
  mmsi: number,
  from?: string,
  to?: string,
  interval: string = '1m',
  limit: number = 2000,
): Promise<PositionRow[]> {
  const where: string[] = ['mmsi = $1'];
  const params: unknown[] = [mmsi];
  let idx = 2;
  if (from) {
    where.push(`timestamp >= $${idx++}`);
    params.push(from);
  }
  if (to) {
    where.push(`timestamp <= $${idx++}`);
    params.push(to);
  }
  const bucket = interval === 'raw' ? null : interval;

  const selectExpr = bucket
    ? `time_bucket($${idx}::interval, timestamp) AS t, ` +
      `AVG(ST_Y(location::geometry)) AS lat, AVG(ST_X(location::geometry)) AS lon, ` +
      `AVG(sog) AS sog, AVG(cog) AS cog, AVG(heading) AS heading, ` +
      `MAX(nav_status) AS nav_status`
    : `timestamp AS t, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lon, ` +
      `sog, cog, heading, nav_status`;

  const groupClause = bucket ? `GROUP BY t ORDER BY t` : 'ORDER BY t';
  const limitClause = `LIMIT $${bucket ? idx + 1 : idx}`;
  if (bucket) params.push(`${bucket}`); else params.push(limit);
  if (bucket) params.push(limit);

  const sql = `SELECT ${selectExpr} FROM vessel_positions WHERE ${where.join(' AND ')} ${groupClause} ${limitClause}`;
  const result = await query<{
    t: Date; lat: number; lon: number; sog: number | null; cog: number | null;
    heading: number | null; nav_status: number | null;
  }>(sql, params);
  return result.rows.map((r) => ({
    timestamp: r.t.toISOString(),
    lat: Number(r.lat),
    lon: Number(r.lon),
    sog: r.sog != null ? Number(r.sog) : undefined,
    cog: r.cog != null ? Number(r.cog) : undefined,
    heading: r.heading != null ? Number(r.heading) : undefined,
    nav_status: r.nav_status != null ? Number(r.nav_status) : undefined,
  }));
}

export interface VoyageSummary {
  mmsi: number;
  start_time: string;
  end_time: string;
  distance_nm: number;
  duration_hours: number;
  avg_speed: number;
  min_speed: number;
  max_speed: number;
  stops: Array<{ start: string; end: string; lat: number; lon: number; hours: number }>;
  positions: PositionRow[];
}

const STOP_SPEED_KN = 0.5;
const STOP_HOURS_THRESHOLD = 2;

export function summarizeVoyage(mmsi: number, positions: PositionRow[]): VoyageSummary {
  const stops: VoyageSummary['stops'] = [];
  let distanceNm = 0;
  let stopStart: PositionRow | null = null;
  let stopStartIdx = -1;
  const speeds: number[] = [];

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]!;
    const cur = positions[i]!;
    const segNm = haversineNm(prev, cur);
    distanceNm += segNm;
    const sog = cur.sog ?? (segNm > 0 && prev.timestamp && cur.timestamp
      ? segNm / Math.max(1 / 3600, (new Date(cur.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 3_600_000)
      : 0);
    speeds.push(sog);

    if (sog <= STOP_SPEED_KN) {
      if (!stopStart) {
        stopStart = cur;
        stopStartIdx = i;
      }
    } else if (stopStart) {
      const hours = (new Date(cur.timestamp).getTime() - new Date(stopStart.timestamp).getTime()) / 3_600_000;
      if (hours >= STOP_HOURS_THRESHOLD) {
        stops.push({
          start: stopStart.timestamp,
          end: cur.timestamp,
          lat: stopStart.lat,
          lon: stopStart.lon,
          hours,
        });
      }
      stopStart = null;
      stopStartIdx = -1;
    }
  }
  if (stopStart && stopStartIdx >= 0 && positions.length > 0) {
    const last = positions[positions.length - 1]!;
    const hours = (new Date(last.timestamp).getTime() - new Date(stopStart.timestamp).getTime()) / 3_600_000;
    if (hours >= STOP_HOURS_THRESHOLD) {
      stops.push({
        start: stopStart.timestamp,
        end: last.timestamp,
        lat: stopStart.lat,
        lon: stopStart.lon,
        hours,
      });
    }
  }

  const start = positions[0];
  const end = positions[positions.length - 1];
  const durationHours = start && end
    ? (new Date(end.timestamp).getTime() - new Date(start.timestamp).getTime()) / 3_600_000
    : 0;
  const avgSpeed = durationHours > 0 ? distanceNm / durationHours : 0;
  const minSpeed = speeds.length ? Math.min(...speeds) : 0;
  const maxSpeed = speeds.length ? Math.max(...speeds) : 0;

  return {
    mmsi,
    start_time: start ? start.timestamp : new Date(0).toISOString(),
    end_time: end ? end.timestamp : new Date(0).toISOString(),
    distance_nm: Math.round(distanceNm * 100) / 100,
    duration_hours: Math.round(durationHours * 100) / 100,
    avg_speed: Math.round(avgSpeed * 100) / 100,
    min_speed: Math.round(minSpeed * 100) / 100,
    max_speed: Math.round(maxSpeed * 100) / 100,
    stops,
    positions,
  };
}

export async function listVoyages(mmsi: number): Promise<Array<Record<string, unknown>>> {
  const r = await query('SELECT * FROM voyages WHERE mmsi = $1 ORDER BY start_time DESC', [mmsi]);
  return r.rows;
}

export async function getVoyage(mmsi: number, id: number): Promise<Record<string, unknown> | null> {
  const r = await query('SELECT * FROM voyages WHERE mmsi = $1 AND id = $2', [mmsi, id]);
  return r.rows[0] ?? null;
}

export interface RouteForecast {
  mmsi: number;
  positions: Array<{ lat: number; lon: number; timestamp: string }>;
  eta: string | null;
  predicted_distance_nm: number;
  avg_speed: number;
}

export function forecastRoute(
  mmsi: number,
  positions: PositionRow[],
  targetLat?: number,
  targetLon?: number,
): RouteForecast {
  if (positions.length === 0) {
    return { mmsi, positions: [], eta: null, predicted_distance_nm: 0, avg_speed: 0 };
  }
  const last = positions[positions.length - 1]!;
  const totalNm = positions.reduce((acc, _p, i) => {
    if (i === 0) return 0;
    return acc + haversineNm(positions[i - 1]!, positions[i]!);
  }, 0);
  const durationHours = positions.length > 1
    ? (new Date(last.timestamp).getTime() - new Date(positions[0]!.timestamp).getTime()) / 3_600_000
    : 0;
  const avgSpeed = durationHours > 0 ? totalNm / durationHours : 0;
  let eta: string | null = null;
  let predNm = totalNm;
  if (targetLat != null && targetLon != null && avgSpeed > 0) {
    predNm = haversineNm(last, { lat: targetLat, lon: targetLon });
    eta = new Date(Date.now() + (predNm / avgSpeed) * 3_600_000).toISOString();
  }
  return {
    mmsi,
    positions: positions.map((p) => ({ lat: p.lat, lon: p.lon, timestamp: p.timestamp })),
    eta,
    predicted_distance_nm: Math.round(predNm * 100) / 100,
    avg_speed: Math.round(avgSpeed * 100) / 100,
  };
}

export async function detectAndStoreVoyages(mmsi: number, log?: LoggerLike): Promise<void> {
  const positions = await getPositions(mmsi, undefined, undefined, 'raw', 20000);
  if (positions.length < 2) return;
  const summary = summarizeVoyage(mmsi, positions);
  const existing = await query('SELECT id FROM voyages WHERE mmsi=$1 AND status=$2 ORDER BY start_time DESC LIMIT 1', [mmsi, 'active']);
  const row = existing.rows[0];
  const start = summary.start_time;
  const end = summary.end_time;
  try {
    if (row) {
      await query(
        `UPDATE voyages SET end_time=$1, distance_nm=$2, avg_speed=$3, max_speed=$4, min_speed=$5, duration_hours=$6 WHERE id=$7`,
        [end, summary.distance_nm, summary.avg_speed, summary.max_speed, summary.min_speed, summary.duration_hours, row.id],
      );
    } else {
      await query(
        `INSERT INTO voyages (mmsi, start_time, end_time, distance_nm, avg_speed, max_speed, min_speed, duration_hours, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')`,
        [mmsi, start, end, summary.distance_nm, summary.avg_speed, summary.max_speed, summary.min_speed, summary.duration_hours],
      );
    }
  } catch (err) {
    log?.warn({ err, mmsi }, 'failed to store voyage');
  }
}
