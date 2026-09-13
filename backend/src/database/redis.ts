import { Redis } from 'ioredis';
import { loadConfig } from '../config/index.js';

let client: Redis | null = null;

export function getRedis(): Redis {
  if (client) return client;
  const config = loadConfig();
  client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export const REDIS_KEYS = {
  position: (mmsi: number) => `pos:${mmsi}`,
  positionsSet: 'positions:index',
  stream: 'positions:stream',
  weatherChannel: 'weather:stream',
  meta: (mmsi: number) => `meta:${mmsi}`,
} as const;

export const POSITION_TTL_SECONDS = 600;
export const META_TTL_SECONDS = 86400;
