import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { loadConfig } from './config/index.js';
import { getPool, pingDatabase, closePool } from './database/db.js';
import { getRedis, closeRedis } from './database/redis.js';
import { registerAuth } from './plugins/auth.js';
import { registerPositionHub } from './websocket/position-hub.js';
import { vesselsRoutes } from './routes/vessels.routes.js';
import { fleetRoutes } from './routes/fleet.routes.js';
import { alertsRoutes } from './routes/alerts.routes.js';
import { weatherRoutes } from './routes/weather.routes.js';
import { exportRoutes } from './routes/export.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { startAisStreamWorker } from './workers/ais-stream.worker.js';
import { startWeatherCacheWorker } from './workers/weather-cache.worker.js';
import { startDemoWorker } from './workers/demo.js';
import { startAlertEvaluator } from './services/alert.service.js';
import { backfillVesselMeta } from './services/ais-ingestion.service.js';

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = Fastify({
    logger: { level: config.BACKEND_LOG_LEVEL },
    trustProxy: true,
  });

  await app.register(cors, { origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()) });
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });
  await app.register(swagger, {
    swagger: {
      info: { title: 'Maritime Ops API', version: '0.1.0', description: 'Open-source maritime tracking + marine weather API' },
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(websocket);

  await registerAuth(app);

  app.get('/health', async () => {
    const db = await pingDatabase();
    let redis = false;
    try {
      const r = getRedis();
      redis = (await r.ping()) === 'PONG';
    } catch {
      redis = false;
    }
    return { status: 'ok', db, redis, uptime: process.uptime() };
  });

  await app.register(
    async (api) => {
      await authRoutes(api);
      await vesselsRoutes(api);
      await fleetRoutes(api);
      await alertsRoutes(api);
      await weatherRoutes(api);
      await exportRoutes(api);
    },
    { prefix: config.API_PREFIX },
  );

  registerPositionHub(app);

  // Start ingestion / background workers.
  const workers: Array<{ stop: () => void } | NodeJS.Timeout> = [];
  workers.push(startAisStreamWorker(app.log));
  workers.push(startDemoWorker(app.log));
  workers.push(startWeatherCacheWorker(app.log));
  workers.push(startAlertEvaluator(app.log));

  // Ensure schema exists (best-effort) before serving.
  try {
    getPool();
    if (await pingDatabase()) {
      app.log.info('database reachable');
      try {
        await backfillVesselMeta();
        app.log.info('vessel metadata cache backfilled');
      } catch (err) {
        app.log.warn({ err }, 'failed to backfill vessel metadata cache');
      }
    }
  } catch (err) {
    app.log.warn({ err }, 'database not reachable at startup — serving anyway');
  }

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'shutting down');
    for (const w of workers) {
      if ('stop' in w) w.stop();
      else clearInterval(w);
    }
    await app.close();
    await closeRedis();
    await closePool();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen({ host: config.BACKEND_HOST, port: config.BACKEND_PORT });
  app.log.info(`Maritime Ops API listening on http://${config.BACKEND_HOST}:${config.BACKEND_PORT}`);
}

void bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
