import { loadConfig } from '../config/index.js';
import { query } from '../database/db.js';
import type { LoggerLike } from '../services/logger.js';

export function startWeatherCacheWorker(log: LoggerLike): NodeJS.Timeout {
  const config = loadConfig();
  return setInterval(async () => {
    try {
      await query(`DELETE FROM weather_cache WHERE timestamp < NOW() - INTERVAL '7 days'`);
      log.debug('weather cache cleanup pass');
    } catch (err) {
      log.warn({ err }, 'weather cache cleanup failed');
    }
  }, Math.max(60_000, config.OPEN_METEO_CACHE_TTL_MS));
}
