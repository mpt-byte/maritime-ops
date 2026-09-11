import type { WebSocket } from 'ws';
import type { FastifyInstance } from 'fastify';
import { getRedis, REDIS_KEYS } from '../database/redis.js';
import { getAllLivePositions, toVesselPosition, type PositionEnvelope } from '../services/ais-ingestion.service.js';
import type { VesselPosition } from '../schemas/index.js';

interface ClientState {
  bbox?: { minLon: number; minLat: number; maxLon: number; maxLat: number };
  mmsi?: Set<number>;
}

const clients = new Map<WebSocket, ClientState>();

function inBbox(p: PositionEnvelope, bbox?: ClientState['bbox']): boolean {
  if (!bbox) return true;
  return (
    p.lon >= bbox.minLon && p.lon <= bbox.maxLon &&
    p.lat >= bbox.minLat && p.lat <= bbox.maxLat
  );
}

function inMmsiFilter(p: PositionEnvelope, mmsi?: Set<number>): boolean {
  if (!mmsi || mmsi.size === 0) return true;
  return mmsi.has(p.mmsi);
}

function send(ws: WebSocket, msg: unknown): void {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function parseSubscribe(payload: unknown): ClientState {
  const state: ClientState = {};
  if (payload && typeof payload === 'object') {
    const p = payload as { bbox?: number[]; mmsi?: number[] };
    if (Array.isArray(p.bbox) && p.bbox.length >= 4) {
      const n = p.bbox.map(Number);
      const minLon = n[0] ?? 0;
      const minLat = n[1] ?? 0;
      const maxLon = n[2] ?? 0;
      const maxLat = n[3] ?? 0;
      if (Number.isFinite(minLon) && Number.isFinite(maxLon)) {
        state.bbox = { minLon, minLat, maxLon, maxLat };
      }
    }
    if (Array.isArray(p.mmsi) && p.mmsi.length > 0) {
      state.mmsi = new Set(p.mmsi.map(Number).filter(Number.isFinite));
    }
  }
  return state;
}

export async function broadcastPosition(p: PositionEnvelope): Promise<void> {
  const payload = { type: 'position', data: toVesselPosition(p) };
  for (const [ws, state] of clients) {
    if (!inBbox(p, state.bbox) || !inMmsiFilter(p, state.mmsi)) continue;
    send(ws, payload);
  }
}

async function startStreamConsumer(log: FastifyInstance['log']): Promise<void> {
  const redis = getRedis();
  let lastId = '$';
  const loop = async () => {
    try {
      const res = await redis.xread('BLOCK', 1000, 'STREAMS', REDIS_KEYS.stream, lastId);
      if (res && Array.isArray(res) && res.length > 0) {
        const [, entries] = res[0] as [string, [string, string[]][]];
        for (const [id, fields] of entries) {
          lastId = id;
          const dataIdx = fields.findIndex((f, i) => i % 2 === 0 && f === 'data');
          const json = dataIdx >= 0 ? fields[dataIdx + 1] : undefined;
          if (!json) continue;
          try {
            const env = JSON.parse(json) as PositionEnvelope;
            await broadcastPosition(env);
          } catch {
            // ignore
          }
        }
      }
    } catch (err) {
      log.warn({ err }, 'ws stream consumer error');
    }
    void loop();
  };
  void loop();
}

export function registerPositionHub(app: FastifyInstance): void {
  app.get('/ws/positions', { websocket: true }, (socket, req) => {
    clients.set(socket, {});
    app.log.info({ total: clients.size }, 'ws client connected');
    void getAllLivePositions().then((positions) => {
      const snapshot: { type: 'snapshot'; data: VesselPosition[] } = {
        type: 'snapshot',
        data: positions.map(toVesselPosition),
      };
      send(socket, snapshot);
    });

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === 'subscribe') {
          const state = parseSubscribe(msg.payload);
          clients.set(socket, state);
          send(socket, { type: 'ack', data: { bbox: !!state.bbox, mmsi: state.mmsi?.size ?? 0 } });
        }
      } catch {
        send(socket, { type: 'error', error: 'invalid message' });
      }
    });

    socket.on('close', () => {
      clients.delete(socket);
      app.log.info({ total: clients.size }, 'ws client disconnected');
    });

    socket.on('error', () => clients.delete(socket));
  });

  void startStreamConsumer(app.log).catch((err) => app.log.error({ err }, 'failed to start ws consumer'));
}
