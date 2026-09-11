import type { FastifyInstance } from 'fastify';
import { exportVesselsCsv, exportVoyageGeoJson, exportVoyageKml, exportDensityGeoJson } from '../services/export.service.js';

export async function exportRoutes(app: FastifyInstance): Promise<void> {
  app.get('/export/vessels.csv', async (_req, reply) => {
    const csv = await exportVesselsCsv();
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="vessels.csv"');
    return csv;
  });

  app.get('/export/voyages/:id.geojson', async (req, reply) => {
    const { id } = req.params as { id: string };
    const mmsi = (req.query as { mmsi?: string }).mmsi;
    if (!mmsi) return reply.code(400).send({ error: 'mmsi required' });
    const geo = await exportVoyageGeoJson(Number(mmsi), Number(id));
    if (!geo) return reply.code(404).send({ error: 'not found' });
    reply.header('Content-Type', 'application/geo+json');
    reply.header('Content-Disposition', `attachment; filename="voyage-${id}.geojson"`);
    return geo;
  });

  app.get('/export/voyages/:id.kml', async (req, reply) => {
    const { id } = req.params as { id: string };
    const mmsi = (req.query as { mmsi?: string }).mmsi;
    if (!mmsi) return reply.code(400).send({ error: 'mmsi required' });
    const kml = await exportVoyageKml(Number(mmsi), Number(id));
    if (!kml) return reply.code(404).send({ error: 'not found' });
    reply.header('Content-Type', 'application/vnd.google-earth.kml+xml');
    reply.header('Content-Disposition', `attachment; filename="voyage-${id}.kml"`);
    return kml;
  });

  app.get('/export/density.geojson', async (req, reply) => {
    const q = req.query as { from?: string; to?: string; cell?: string };
    const geo = await exportDensityGeoJson(q.from, q.to, q.cell ? Number(q.cell) : 1);
    reply.header('Content-Type', 'application/geo+json');
    return geo;
  });
}
