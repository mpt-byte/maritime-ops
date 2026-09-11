import type { FastifyInstance } from 'fastify';
import { query } from '../database/db.js';
import { CreateFleetGroup, AddFleetVessel } from '../schemas/index.js';
import { getAllLivePositions, getLivePosition } from '../services/ais-ingestion.service.js';

export async function fleetRoutes(app: FastifyInstance): Promise<void> {
  app.get('/fleet', async (_req) => {
    const r = await query(
      `SELECT fv.mmsi, fg.id AS group_id, fg.name AS group_name, fg.color, v.*
       FROM fleet_vessels fv
       JOIN fleet_groups fg ON fg.id = fv.group_id
       LEFT JOIN vessels v ON v.mmsi = fv.mmsi`,
    );
    const live = await getAllLivePositions();
    const liveByMmsi = new Map(live.map((p) => [p.mmsi, p]));
    const data = r.rows.map((row) => {
      const mmsi = Number(row.mmsi);
      const p = liveByMmsi.get(mmsi);
      let status = 'unknown';
      if (p) {
        const sog = p.sog ?? 0;
        if (sog < 0.5) status = 'stopped';
        else if (sog < 1) status = 'in_port';
        else status = 'underway';
      }
      return { ...row, status, last_position: p ?? null };
    });
    return { total: data.length, data };
  });

  app.get('/fleet/groups', async () => {
    const r = await query(
      `SELECT g.*, COUNT(fv.mmsi)::int AS vessel_count
       FROM fleet_groups g LEFT JOIN fleet_vessels fv ON fv.group_id = g.id
       GROUP BY g.id ORDER BY g.id`,
    );
    return { data: r.rows };
  });

  app.post('/fleet/groups', async (req, reply) => {
    const parsed = CreateFleetGroup.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const g = parsed.data;
    const r = await query(
      'INSERT INTO fleet_groups (name, description, color) VALUES ($1,$2,$3) RETURNING *',
      [g.name, g.description ?? null, g.color ?? null],
    );
    return reply.code(201).send(r.rows[0]);
  });

  app.post('/fleet/groups/:id/vessels', async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = AddFleetVessel.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const r = await query(
      'INSERT INTO fleet_vessels (group_id, mmsi) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *',
      [Number(id), parsed.data.mmsi],
    );
    return reply.code(201).send(r.rows[0] ?? { ok: true });
  });

  app.delete('/fleet/groups/:id/vessels/:mmsi', async (req) => {
    const { id, mmsi } = req.params as { id: string; mmsi: string };
    await query('DELETE FROM fleet_vessels WHERE group_id = $1 AND mmsi = $2', [Number(id), Number(mmsi)]);
    return { ok: true };
  });

  app.get('/fleet/stats', async (_req) => {
    const live = await getAllLivePositions();
    const underway = live.filter((p) => (p.sog ?? 0) >= 1).length;
    const stopped = live.filter((p) => (p.sog ?? 0) < 1).length;
    return {
      total: live.length,
      underway,
      stopped,
      in_port: live.filter((p) => (p.sog ?? 0) < 0.5).length,
    };
  });

  app.get('/fleet/:mmsi', async (req, reply) => {
    const { mmsi } = req.params as { mmsi: string };
    const mmsiNum = Number(mmsi);
    const p = await getLivePosition(mmsiNum);
    return { mmsi: mmsiNum, last_position: p };
  });
}
