import type { FastifyInstance } from 'fastify';
import { query } from '../database/db.js';
import { CreateAlertRule } from '../schemas/index.js';
import { createRule, acknowledgeAlert } from '../services/alert.service.js';

export async function alertsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/alerts', async (req) => {
    const limit = Number((req.query as { limit?: string }).limit ?? 100);
    const r = await query(
      `SELECT a.*, v.name AS vessel_name FROM alerts a
       LEFT JOIN vessels v ON v.mmsi = a.mmsi
       ORDER BY a.created_at DESC LIMIT $1`,
      [Math.min(Math.max(limit, 1), 1000)],
    );
    return { total: r.rows.length, data: r.rows };
  });

  app.get('/alerts/rules', async () => {
    const r = await query('SELECT * FROM alert_rules ORDER BY id');
    return { data: r.rows };
  });

  app.post('/alerts/rules', async (req, reply) => {
    const parsed = CreateAlertRule.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const r = parsed.data;
    const rule = await createRule({
      name: r.name,
      alert_type: r.alert_type,
      mmsi: r.mmsi ?? null,
      group_id: r.group_id ?? null,
      config: r.config,
      severity: r.severity,
      enabled: r.enabled,
    });
    return reply.code(201).send(rule);
  });

  app.post('/alerts/:id/acknowledge', async (req) => {
    const { id } = req.params as { id: string };
    await acknowledgeAlert(Number(id), 'admin');
    return { ok: true };
  });
}
