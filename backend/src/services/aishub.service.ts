import type { LoggerLike } from './logger.js';
import { loadConfig } from '../config/index.js';
import { ingestPosition, ingestStatic } from './ais-ingestion.service.js';
import { decodeNmeaVdmBody, decodePositionReport, decodeStaticReport } from './ais-decode.js';

// AISHub returns JSON of the form:
// [
//   [ { MMSI:..., ...rows } ],
//   [ { MMSI:..., ...rows } ]
// ]
// Each inner array is a position-report batch. See https://www.aishub.net/api
export async function pollAishub(log: LoggerLike): Promise<number> {
  const config = loadConfig();
  if (!config.AISHUB_ENABLED || !config.AISHUB_API_KEY) return 0;
  const url = 'https://data.aishub.net/ws.php' +
    `?username=${encodeURIComponent(config.AISHUB_API_KEY)}&format=1&output=json&compress=0`;
  let count = 0;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      log.warn({ status: res.status }, 'aishub http error');
      return 0;
    }
    const data = (await res.json()) as Array<Record<string, unknown>> | Record<string, { MMSI: number; LATITUDE: number; LONGITUDE: number }[]>;
    const batches = Array.isArray(data) ? data : Object.values(data || {});
    for (const batch of batches) {
      const rows = Array.isArray(batch) ? batch : [batch];
      for (const row of rows) {
        const r = row as { MMSI?: number; LATITUDE?: number; LONGITUDE?: number; SPEED?: number; COURSE?: number; HEADING?: number; NAVSTAT?: number };
        if (!r.MMSI || r.LATITUDE == null || r.LONGITUDE == null) continue;
        await ingestPosition({
          mmsi: Number(r.MMSI),
          lat: Number(r.LATITUDE),
          lon: Number(r.LONGITUDE),
          sog: r.SPEED != null ? Number(r.SPEED) / 10 : undefined,
          cog: r.COURSE != null ? Number(r.COURSE) / 10 : undefined,
          heading: r.HEADING != null ? Number(r.HEADING) : undefined,
          nav_status: r.NAVSTAT != null ? Number(r.NAVSTAT) : undefined,
        }, 'aishub', log);
        count++;
      }
    }
  } catch (err) {
    log.warn({ err }, 'aishub poll failed');
  }
  return count;
}

export function startAishubPoller(log: LoggerLike): NodeJS.Timeout {
  const config = loadConfig();
  return setInterval(() => {
    void pollAishub(log).catch((err) => log.warn({ err }, 'aishub poller error'));
  }, config.AISHUB_POLL_INTERVAL_MS);
}

export function handleNmeaSentence(sentence: string, log: LoggerLike): void {
  const body = decodeNmeaVdmBody(sentence);
  if (!body) return;
  const pos = decodePositionReport(body, 0);
  if (pos) {
    void ingestPosition(pos, 'nmea', log);
    return;
  }
  const stat = decodeStaticReport(body);
  if (stat) void ingestStatic(stat, 'nmea', log);
}
