import { loadConfig, isDemoMode } from '../config/index.js';
import { ingestPosition, ingestStatic } from '../services/ais-ingestion.service.js';
import type { LoggerLike } from '../services/logger.js';

const NAMES = ['Atlantic Trader', 'Northwind', 'Sea Falcon', 'Blue Horizon', 'Ocean Pearl', 'Star of Asia', 'Port Royal', 'Mariner', 'Crestwave', 'Deep Blue', 'Sirena', 'Albatros'];

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function makeVessels(count: number) {
  const vessels = [];
  for (let i = 0; i < count; i++) {
    vessels.push({
      mmsi: 247100000 + i,
      name: NAMES[i % NAMES.length]! + ' ' + (i + 1),
      lat: rnd(35, 60),
      lon: rnd(-10, 30),
      sog: rnd(0, 22),
      cog: rnd(0, 360),
      heading: rnd(0, 360),
      ship_type: [70, 80, 30, 60, 31][i % 5],
    });
  }
  return vessels;
}

export function startDemoWorker(log: LoggerLike): { stop: () => void } {
  const config = loadConfig();
  if (!isDemoMode(config)) return { stop: () => {} };
  log.info('Demo mode active — generating synthetic AIS positions');
  const vessels = makeVessels(40);
  for (const v of vessels) {
    void ingestStatic({
      mmsi: v.mmsi,
      name: v.name,
      ship_type: v.ship_type,
      flag: 'ITA',
    }, 'demo', log);
  }
  const interval = setInterval(() => {
    for (const v of vessels) {
      const dt = 5 / 3600;
      const distNm = v.sog * dt;
      const rad = (v.cog * Math.PI) / 180;
      const lat = v.lat + (distNm / 60) * Math.cos(rad);
      const lon = v.lon + (distNm / 60) * Math.sin(rad) / Math.cos((v.lat * Math.PI) / 180);
      v.lat = Math.max(-89, Math.min(89, lat));
      v.lon = ((lon + 540) % 360) - 180;
      v.cog = (v.cog + rnd(-5, 5)) % 360;
      v.sog = Math.max(0, Math.min(25, v.sog + rnd(-1, 1)));
      void ingestPosition({
        mmsi: v.mmsi,
        lat: v.lat,
        lon: v.lon,
        sog: v.sog,
        cog: v.cog,
        heading: v.heading,
        nav_status: 0,
      }, 'demo', log);
    }
  }, 5000);
  return { stop: () => clearInterval(interval) };
}
