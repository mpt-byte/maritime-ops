import type { FastifyInstance } from 'fastify';
import { WeatherPointQuery, WeatherRouteQuery } from '../schemas/index.js';
import { getPointForecast, getRouteForecast, parsePoints, WEATHER_MODELS, WEATHER_LAYERS } from '../services/weather.service.js';

export async function weatherRoutes(app: FastifyInstance): Promise<void> {
  app.get('/weather/point', async (req, reply) => {
    const parsed = WeatherPointQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const q = parsed.data;
    const data = await getPointForecast(q.lat, q.lon, q.model, q.hours, app.log);
    return { lat: q.lat, lon: q.lon, model: q.model, hours: q.hours, data };
  });

  app.get('/weather/layers', async () => {
    return { models: WEATHER_MODELS, layers: WEATHER_LAYERS };
  });

  app.get('/weather/forecast', async (req, reply) => {
    const parsed = WeatherPointQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const q = parsed.data;
    const models = ['best_match', 'ecmwf', 'gfs', 'icon'];
    const out: Record<string, unknown> = {};
    for (const m of models) {
      out[m] = await getPointForecast(q.lat, q.lon, m, q.hours, app.log);
    }
    return { lat: q.lat, lon: q.lon, models: out };
  });

  app.get('/weather/route', async (req, reply) => {
    const parsed = WeatherRouteQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const q = parsed.data;
    const points = parsePoints(q.points);
    if (points.length === 0) return reply.code(400).send({ error: 'no points' });
    const data = await getRouteForecast(points, q.model, q.hours, app.log);
    return { model: q.model, points: points.length, data };
  });
}
