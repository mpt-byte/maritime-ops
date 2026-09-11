import type { FastifyInstance } from 'fastify';
import { query } from '../database/db.js';
import { getAllLivePositions, getLivePosition } from '../services/ais-ingestion.service.js';
import {
  VesselListQuery, PositionsQuery, Vessel,
} from '../schemas/index.js';
import { getPositions, listVoyages, getVoyage, summarizeVoyage, forecastRoute } from '../services/voyage.service.js';

function rowToVessel(r: Record<string, unknown>) {
  return {
    mmsi: Number(r.mmsi),
    imo: r.imo != null ? Number(r.imo) : undefined,
    name: r.name ?? undefined,
    callsign: r.callsign ?? undefined,
    ship_type: r.ship_type != null ? Number(r.ship_type) : undefined,
    flag: r.flag ?? undefined,
    length: r.length != null ? Number(r.length) : undefined,
    width: r.width != null ? Number(r.width) : undefined,
    draught: r.draught != null ? Number(r.draught) : undefined,
    gross_tonnage: r.gross_tonnage != null ? Number(r.gross_tonnage) : undefined,
    photo_url: r.photo_url ?? undefined,
    updated_at: r.updated_at instanceof Date ? (r.updated_at as Date).toISOString() : r.updated_at,
  };
}

export async function vesselsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/vessels', async (req, reply) => {
    const parsed = VesselListQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const q = parsed.data;
    const offset = (q.page - 1) * q.pageSize;
    const where: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    if (q.q) {
      where.push(`(name ILIKE $${idx} OR callsign ILIKE $${idx} OR CAST(mmsi AS TEXT) ILIKE $${idx} OR CAST(imo AS TEXT) ILIKE $${idx})`);
      params.push(`%${q.q}%`);
      idx++;
    }
    if (q.ship_type != null) { where.push(`ship_type = $${idx++}`); params.push(q.ship_type); }
    if (q.flag) { where.push(`flag = $${idx++}`); params.push(q.flag); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortCol = q.sort === 'name' ? 'name' : q.sort === 'mmsi' ? 'mmsi' : 'updated_at';
    const sql = `SELECT * FROM vessels ${whereClause} ORDER BY ${sortCol} ${sortCol === 'updated_at' ? 'DESC' : 'ASC'} LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(q.pageSize, offset);
    const r = await query(sql, params);
    const totalRow = await query(`SELECT COUNT(*)::int AS c FROM vessels ${whereClause}`, params.slice(0, idx - 3));
    return { page: q.page, pageSize: q.pageSize, total: totalRow.rows[0]?.c ?? 0, data: r.rows.map(rowToVessel) };
  });

  app.get('/vessels/:mmsi', async (req, reply) => {
    const { mmsi } = req.params as { mmsi: string };
    const mmsiNum = Number(mmsi);
    if (!Number.isFinite(mmsiNum)) return reply.code(400).send({ error: 'invalid mmsi' });
    const r = await query('SELECT * FROM vessels WHERE mmsi = $1', [mmsiNum]);
    const vessel = r.rows[0];
    if (!vessel) return reply.code(404).send({ error: 'not found' });
    const live = await getLivePosition(mmsiNum);
    return { ...rowToVessel(vessel), last_position: live };
  });

  app.get('/vessels/live', async () => {
    const live = await getAllLivePositions();
    return { total: live.length, data: live };
  });

  app.get('/vessels/:mmsi/positions', async (req, reply) => {
    const { mmsi } = req.params as { mmsi: string };
    const mmsiNum = Number(mmsi);
    if (!Number.isFinite(mmsiNum)) return reply.code(400).send({ error: 'invalid mmsi' });
    const parsed = PositionsQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { from, to, interval, limit } = parsed.data;
    const positions = await getPositions(mmsiNum, from, to, interval, limit);
    return { total: positions.length, data: positions };
  });

  app.get('/vessels/:mmsi/voyages', async (req) => {
    const { mmsi } = req.params as { mmsi: string };
    return { data: await listVoyages(Number(mmsi)) };
  });

  app.get('/vessels/:mmsi/voyages/:id', async (req, reply) => {
    const { mmsi, id } = req.params as { mmsi: string; id: string };
    const v = await getVoyage(Number(mmsi), Number(id));
    if (!v) return reply.code(404).send({ error: 'not found' });
    return v;
  });

  app.get('/vessels/:mmsi/voyages/:id/report', async (req, reply) => {
    const { mmsi, id } = req.params as { mmsi: string; id: string };
    const mmsiNum = Number(mmsi);
    const idNum = Number(id);
    const v = await getVoyage(mmsiNum, idNum);
    if (!v) return reply.code(404).send({ error: 'not found' });
    const start = v.start_time instanceof Date ? v.start_time.toISOString() : String(v.start_time);
    const end = v.end_time ? (v.end_time instanceof Date ? v.end_time.toISOString() : String(v.end_time)) : undefined;
    const positions = await getPositions(mmsiNum, start, end, 'raw', 20000);
    const summary = summarizeVoyage(mmsiNum, positions);
    return { voyage: v, summary };
  });

  app.get('/vessels/:mmsi/forecast', async (req, reply) => {
    const { mmsi } = req.params as { mmsi: string };
    const mmsiNum = Number(mmsi);
    const positions = await getPositions(mmsiNum, undefined, undefined, '1m', 2000);
    const lat = (req.query as { lat?: string }).lat;
    const lon = (req.query as { lon?: string }).lon;
    return forecastRoute(mmsiNum, positions, lat != null ? Number(lat) : undefined, lon != null ? Number(lon) : undefined);
  });

  app.post('/vessels', async (req, reply) => {
    const parsed = Vessel.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const v = parsed.data;
    const r = await query(
      `INSERT INTO vessels (mmsi, imo, name, callsign, ship_type, flag, length, width, draught, gross_tonnage, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (mmsi) DO UPDATE SET
         imo = COALESCE(EXCLUDED.imo, vessels.imo),
         name = COALESCE(EXCLUDED.name, vessels.name),
         callsign = COALESCE(EXCLUDED.callsign, vessels.callsign),
         ship_type = COALESCE(EXCLUDED.ship_type, vessels.ship_type),
         flag = COALESCE(EXCLUDED.flag, vessels.flag),
         updated_at = NOW()
       RETURNING *`,
      [v.mmsi, v.imo ?? null, v.name ?? null, v.callsign ?? null, v.ship_type ?? null, v.flag ?? null,
       v.length ?? null, v.width ?? null, v.draught ?? null, v.gross_tonnage ?? null, v.photo_url ?? null],
    );
    return reply.code(201).send(rowToVessel(r.rows[0]!));
  });
}
