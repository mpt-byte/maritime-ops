import { query } from '../database/db.js';
import { getAllLivePositions } from './ais-ingestion.service.js';
import { getPositions, type PositionRow, haversineNm } from './voyage.service.js';

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    if (v == null) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => escape(r[h])).join(','));
  return lines.join('\n');
}

export function toKml(lineName: string, positions: PositionRow[]): string {
  const coords = positions.map((p) => `${p.lon},${p.lat},0`).join(' ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document><name>${escapeXml(lineName)}</name>
    <Placemark><name>${escapeXml(lineName)}</name>
      <LineString><tessellate>1</tessellate>
        <coordinates>${coords}</coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] ?? c);
}

export function voyageToGeoJson(mmsi: number, voyage: Record<string, unknown>, positions: PositionRow[]): unknown {
  const coords = positions.map((p) => [p.lon, p.lat]);
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: { mmsi, ...voyage },
      },
      ...positions.map((p, i) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { mmsi, index: i, timestamp: p.timestamp, sog: p.sog, cog: p.cog },
      })),
    ],
  };
}

export async function exportVesselsCsv(): Promise<string> {
  const live = await getAllLivePositions();
  const rows = live.map((p) => ({
    mmsi: p.mmsi,
    lat: p.lat,
    lon: p.lon,
    sog: p.sog ?? '',
    cog: p.cog ?? '',
    heading: p.heading ?? '',
    nav_status: p.nav_status ?? '',
    timestamp: p.timestamp,
    source: p.source ?? '',
  }));
  return toCsv(rows);
}

export async function exportVoyageGeoJson(mmsi: number, voyageId: number): Promise<unknown> {
  const r = await query('SELECT * FROM voyages WHERE mmsi=$1 AND id=$2', [mmsi, voyageId]);
  const voyage = r.rows[0];
  if (!voyage) return null;
  const start = voyage.start_time instanceof Date ? voyage.start_time.toISOString() : String(voyage.start_time);
  const end = voyage.end_time ? (voyage.end_time instanceof Date ? voyage.end_time.toISOString() : String(voyage.end_time)) : undefined;
  const positions = await getPositions(mmsi, start, end, 'raw', 20000);
  return voyageToGeoJson(mmsi, voyage, positions);
}

export async function exportVoyageKml(mmsi: number, voyageId: number): Promise<string | null> {
  const r = await query('SELECT * FROM voyages WHERE mmsi=$1 AND id=$2', [mmsi, voyageId]);
  const voyage = r.rows[0];
  if (!voyage) return null;
  const start = voyage.start_time instanceof Date ? voyage.start_time.toISOString() : String(voyage.start_time);
  const end = voyage.end_time ? (voyage.end_time instanceof Date ? voyage.end_time.toISOString() : String(voyage.end_time)) : undefined;
  const positions = await getPositions(mmsi, start, end, 'raw', 20000);
  return toKml(`Voyage ${voyageId} (MMSI ${mmsi})`, positions);
}

export async function exportDensityGeoJson(from?: string, to?: string, cell = 1): Promise<unknown> {
  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (from) { where.push(`timestamp >= $${idx++}`); params.push(from); }
  if (to) { where.push(`timestamp <= $${idx++}`); params.push(to); }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT
      FLOOR(ST_Y(location::geometry) / $${idx}) * $${idx} AS cell_lat,
      FLOOR(ST_X(location::geometry) / $${idx}) * $${idx} AS cell_lon,
      COUNT(DISTINCT mmsi) AS vessels,
      COUNT(*) AS samples
    FROM vessel_positions
    ${whereClause}
    GROUP BY cell_lat, cell_lon
    LIMIT 5000
  `;
  params.push(cell);
  const r = await query<{ cell_lat: number; cell_lon: number; vessels: number; samples: number }>(sql, params);
  return {
    type: 'FeatureCollection',
    features: r.rows.map((row) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(row.cell_lon), Number(row.cell_lat)] },
      properties: { vessels: Number(row.vessels), samples: Number(row.samples) },
    })),
  };
}

export function densityHeatmap(_a: unknown): number {
  return 0;
}

export { haversineNm };
