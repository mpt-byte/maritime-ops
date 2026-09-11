import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../database/db.js';
import { loadConfig } from '../config/index.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
  sub: string;
  role: 'admin' | 'viewer';
}

declare module 'fastify' {
  interface FastifyInstance {
    auth: {
      login: (username: string, password: string) => Promise<{ token: string; role: string } | null>;
      verify: (token: string) => JwtPayload | null;
      ensureAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<boolean>;
      ensureUser: (req: FastifyRequest, reply: FastifyReply) => Promise<boolean>;
    };
  }
}

async function ensureSeedAdmin(): Promise<void> {
  const config = loadConfig();
  const existing = await query<{ username: string }>('SELECT username FROM users WHERE username = $1', [config.ADMIN_USERNAME]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(config.ADMIN_PASSWORD, 10);
    await query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [config.ADMIN_USERNAME, hash, 'admin'],
    );
  }
}

export async function registerAuth(app: FastifyInstance): Promise<void> {
  const config = loadConfig();
  await ensureSeedAdmin().catch((err) => app.log.warn({ err }, 'admin seed failed'));

  app.decorate('auth', {
    async login(username, password) {
      const r = await query<{ password_hash: string; role: string }>(
        'SELECT password_hash, role FROM users WHERE username = $1',
        [username],
      );
      const row = r.rows[0];
      if (!row) return null;
      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) return null;
      const role: 'admin' | 'viewer' = row.role === 'admin' ? 'admin' : 'viewer';
      const token = jwt.sign({ sub: username, role } satisfies JwtPayload, config.JWT_SECRET, {
        expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
        audience: config.JWT_AUDIENCE,
        issuer: config.JWT_ISSUER,
      });
      return { token, role };
    },
    verify(token) {
      try {
        const p = jwt.verify(token, config.JWT_SECRET, {
          audience: config.JWT_AUDIENCE,
          issuer: config.JWT_ISSUER,
        }) as JwtPayload;
        return p;
      } catch {
        return null;
      }
    },
    async ensureUser(req, reply) {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'unauthorized' });
        return false;
      }
      const payload = app.auth.verify(header.slice(7));
      if (!payload) {
        reply.code(401).send({ error: 'invalid token' });
        return false;
      }
      (req as FastifyRequest & { user?: JwtPayload }).user = payload;
      return true;
    },
    async ensureAdmin(req, reply) {
      const ok = await app.auth.ensureUser(req, reply);
      if (!ok) return false;
      const user = (req as FastifyRequest & { user?: JwtPayload }).user;
      if (user?.role !== 'admin') {
        reply.code(403).send({ error: 'forbidden' });
        return false;
      }
      return true;
    },
  });
}
