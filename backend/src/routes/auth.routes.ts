import type { FastifyInstance } from 'fastify';
import { LoginBody, PushSubscribeBody } from '../schemas/index.js';
import { query } from '../database/db.js';
import { loadConfig } from '../config/index.js';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { username, password } = parsed.data;
    const result = await app.auth.login(username, password);
    if (!result) return reply.code(401).send({ error: 'invalid credentials' });
    return { token: result.token, role: result.role };
  });

  app.get('/auth/me', async (req, reply) => {
    const ok = await app.auth.ensureUser(req, reply);
    if (!ok) return;
    const user = (req as unknown as { user?: { sub: string; role: string } }).user;
    return { username: user?.sub, role: user?.role };
  });

  app.post('/push/subscribe', async (req, reply) => {
    const parsed = PushSubscribeBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const sub = parsed.data;
    await query(
      `INSERT INTO push_subscriptions (endpoint, p256dh_key, auth_key, user)
       VALUES ($1,$2,$3,$4) ON CONFLICT (endpoint) DO NOTHING`,
      [sub.endpoint, sub.keys.p256dh, sub.keys.auth, 'anonymous'],
    );
    return reply.code(201).send({ ok: true });
  });

  app.post('/push/test', async (_req, reply) => {
    const config = loadConfig();
    if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
      return reply.code(503).send({ error: 'VAPID keys not configured' });
    }
    const r = await query<{ endpoint: string; p256dh_key: string; auth_key: string }>(
      'SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions LIMIT 1',
    );
    const sub = r.rows[0];
    if (!sub) return reply.code(404).send({ error: 'no subscriptions' });
    return { sent: 0, note: 'web-push delivery handled at runtime via web-push package' };
  });
}
