import WebSocket from 'ws';
import { loadConfig } from '../config/index.js';
import { ingestPosition, ingestStatic } from '../services/ais-ingestion.service.js';
import {
  decodePositionReport, decodeStaticReport,
} from '../services/ais-decode.js';
import type { LoggerLike } from '../services/logger.js';

function parseBboxes(s: string): number[][] {
  return s.split(';')
    .map((b) => b.split(',').map(Number))
    .filter((arr) => arr.length === 4 && arr.every(Number.isFinite));
}

interface AISstreamMessage {
  MessageType: string;
  Metadata?: { ShipName?: string };
  AISMessage?: {
    MessageType?: number;
    MMSI?: number;
    Latitude?: number;
    Longitude?: number;
    Sog?: number;
    Cog?: number;
    TrueHeading?: number;
    NavigationStatus?: number;
    Static?: {
      ImoNumber?: number;
      Name?: string;
      CallSign?: string;
      Type?: number;
      Destination?: string;
      MaximumStaticDraught?: number;
      Dimension?: { A?: number; B?: number; C?: number; D?: number };
    };
  };
}

export function startAisStreamWorker(log: LoggerLike): { stop: () => void } {
  const config = loadConfig();
  if (!config.AISSTREAM_ENABLED || !config.AISSTREAM_API_KEY.trim()) {
    log.info('AISstream disabled (no API key) — use demo worker for synthetic data');
    return { stop: () => {} };
  }
  const bboxes = parseBboxes(config.AISSTREAM_BBOXES);
  let stopped = false;
  let ws: WebSocket | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;

  const connect = () => {
    if (stopped) return;
    ws = new WebSocket('wss://stream.aisstream.io/v0/stream');
    ws.on('open', () => {
      log.info('AISstream connected');
      ws?.send(JSON.stringify({ APIKey: config.AISSTREAM_API_KEY, BoundingBoxes: bboxes }));
    });
    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as AISstreamMessage;
        const a = msg.AISMessage;
        if (!a || a.MMSI == null) return;
        if (a.Latitude != null && a.Longitude != null) {
          await ingestPosition({
            mmsi: Number(a.MMSI),
            lat: Number(a.Latitude),
            lon: Number(a.Longitude),
            sog: a.Sog != null ? Number(a.Sog) : undefined,
            cog: a.Cog != null ? Number(a.Cog) : undefined,
            heading: a.TrueHeading != null ? Number(a.TrueHeading) : undefined,
            nav_status: a.NavigationStatus != null ? Number(a.NavigationStatus) : undefined,
          }, 'aisstream', log);
        }
        if (a.Static?.Name) {
          await ingestStatic({
            mmsi: Number(a.MMSI),
            imo: a.Static.ImoNumber ? Number(a.Static.ImoNumber) : undefined,
            name: a.Static.Name,
            callsign: a.Static.CallSign,
            ship_type: a.Static.Type != null ? Number(a.Static.Type) : undefined,
            destination: a.Static.Destination,
            draught: a.Static.MaximumStaticDraught != null ? Number(a.Static.MaximumStaticDraught) : undefined,
          }, 'aisstream', log);
        }
      } catch (err) {
        log.warn({ err }, 'aisstream message parse failed');
      }
    });
    ws.on('error', (err) => log.warn({ err }, 'aisstream ws error'));
    ws.on('close', () => {
      log.warn('aisstream closed, reconnecting in 5s');
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(connect, 5000);
    });
  };
  connect();

  return {
    stop: () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}

export function decodeDemoSentence(sentence: string): void {
  const body = sentence.split(',')[5] ?? '';
  const pos = decodePositionReport(body, 0);
  if (pos) void ingestPosition(pos, 'demo', undefined);
  const stat = decodeStaticReport(body);
  if (stat) void ingestStatic(stat, 'demo', undefined);
}
