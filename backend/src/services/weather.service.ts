import { query } from '../database/db.js';
import { loadConfig } from '../config/index.js';
import type { LoggerLike } from './logger.js';

export interface WeatherPoint {
  lat: number;
  lon: number;
  model: string;
  timestamp: string;
  wind_speed?: number;
  wind_dir?: number;
  wave_height?: number;
  wave_period?: number;
  wave_dir?: number;
  pressure?: number;
  air_temp?: number;
  sea_temp?: number;
  precipitation?: number;
  visibility?: number;
  cloud_cover?: number;
  humidity?: number;
}

export const WEATHER_MODELS = {
  best_match: 'Open-Meteo ensemble (best match)',
  ecmwf: 'ECMWF (IFS)',
  gfs: 'NOAA GFS',
  icon: 'DWD ICON',
  gfs_wave: 'NOAA GFS Wave (marine)',
  icon_wave: 'DWD ICON Wave (marine)',
} as const;

export const WEATHER_LAYERS = [
  { id: 'wind_speed', label: 'Wind speed (m/s)', unit: 'm/s' },
  { id: 'wind_dir', label: 'Wind direction', unit: 'deg' },
  { id: 'wind_gusts', label: 'Wind gusts (m/s)', unit: 'm/s' },
  { id: 'wave_height', label: 'Significant wave height (m)', unit: 'm' },
  { id: 'wave_period', label: 'Wave period (s)', unit: 's' },
  { id: 'wave_dir', label: 'Wave direction', unit: 'deg' },
  { id: 'pressure', label: 'Sea-level pressure (hPa)', unit: 'hPa' },
  { id: 'sea_temp', label: 'Sea surface temperature (°C)', unit: '°C' },
  { id: 'air_temp', label: 'Air temperature (°C)', unit: '°C' },
  { id: 'precipitation', label: 'Precipitation (mm)', unit: 'mm' },
  { id: 'cloud_cover', label: 'Cloud cover (%)', unit: '%' },
  { id: 'humidity', label: 'Relative humidity (%)', unit: '%' },
  { id: 'visibility', label: 'Visibility (m)', unit: 'm' },
];

const modelToOpenMeteo: Record<string, string> = {
  best_match: 'best_match',
  ecmwf: 'ecmwf',
  gfs: 'gfs',
  icon: 'icon',
  gfs_wave: 'gfs_seamless',
  icon_wave: 'icon_seamless',
};

async function fetchOpenMeteo(
  lat: number,
  lon: number,
  model: string,
  hours: number,
  log?: LoggerLike,
): Promise<WeatherPoint[]> {
  const config = loadConfig();
  const omModel = modelToOpenMeteo[model] ?? 'best_match';
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: [
      'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
      'wave_height', 'wave_period', 'wave_direction',
      'pressure_msl', 'sea_surface_temperature',
      'temperature_2m', 'precipitation', 'cloud_cover',
      'relative_humidity_2m', 'visibility',
    ].join(','),
    models: omModel,
    forecast_days: String(Math.max(1, Math.ceil(hours / 24))),
    timezone: 'UTC',
  });
  if (config.OPEN_METEO_API_KEY) params.set('apikey', config.OPEN_METEO_API_KEY);
  const url = `${config.OPEN_METEO_BASE_URL}/forecast?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    log?.warn({ status: res.status, url }, 'open-meteo http error');
    return [];
  }
  const data = (await res.json()) as Record<string, unknown>;
  const hourly = (data.hourly ?? {}) as Record<string, unknown[] | undefined>;
  const times = (hourly.time ?? []) as string[];
  const pick = (k: string) => (hourly[k] as number[] | undefined) ?? [];
  const out: WeatherPoint[] = [];
  for (let i = 0; i < Math.min(times.length, hours); i++) {
    const ws = pick('wind_speed_10m');
    const wd = pick('wind_direction_10m');
    const wh = pick('wave_height');
    const wp = pick('wave_period');
    const wdir = pick('wave_direction');
    const p = pick('pressure_msl');
    const at = pick('temperature_2m');
    const sst = pick('sea_surface_temperature');
    const pr = pick('precipitation');
    const cc = pick('cloud_cover');
    const rh = pick('relative_humidity_2m');
    const vis = pick('visibility');
    out.push({
      lat,
      lon,
      model,
      timestamp: times[i] ?? '',
      wind_speed: ws[i] as number | undefined,
      wind_dir: wd[i] as number | undefined,
      wave_height: wh[i] as number | undefined,
      wave_period: wp[i] as number | undefined,
      wave_dir: wdir[i] as number | undefined,
      pressure: p[i] as number | undefined,
      air_temp: at[i] as number | undefined,
      sea_temp: sst[i] as number | undefined,
      precipitation: pr[i] as number | undefined,
      cloud_cover: cc[i] as number | undefined,
      humidity: rh[i] as number | undefined,
      visibility: vis[i] as number | undefined,
    });
  }
  await cacheWeatherPoints(out, log).catch((err) => log?.warn({ err }, 'weather cache write failed'));
  return out;
}

async function cacheWeatherPoints(points: WeatherPoint[], log?: LoggerLike): Promise<void> {
  if (points.length === 0) return;
  for (const p of points) {
    await query(
      `INSERT INTO weather_cache
         (location, timestamp, model, wind_speed, wind_dir, wave_height, wave_period,
          wave_dir, pressure, air_temp, sea_temp, precipitation, visibility, cloud_cover, humidity)
       VALUES (ST_MakePoint($1,$2)::geography, $3, $4, $5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       ON CONFLICT (location, timestamp, model) DO NOTHING`,
      [
        p.lon, p.lat, p.timestamp, p.model,
        p.wind_speed ?? null, p.wind_dir ?? null, p.wave_height ?? null, p.wave_period ?? null,
        p.wave_dir ?? null, p.pressure ?? null, p.air_temp ?? null, p.sea_temp ?? null,
        p.precipitation ?? null, p.visibility ?? null, p.cloud_cover ?? null, p.humidity ?? null,
      ],
    );
  }
  log?.debug({ count: points.length }, 'cached weather points');
}

export async function getPointForecast(
  lat: number,
  lon: number,
  model: string,
  hours: number,
  log?: LoggerLike,
): Promise<WeatherPoint[]> {
  return fetchOpenMeteo(lat, lon, model, hours, log);
}

export async function getRouteForecast(
  points: Array<{ lat: number; lon: number }>,
  model: string,
  hours: number,
  log?: LoggerLike,
): Promise<Array<{ point: { lat: number; lon: number }; forecast: WeatherPoint[] }>> {
  const out: Array<{ point: { lat: number; lon: number }; forecast: WeatherPoint[] }> = [];
  for (const p of points) {
    const fc = await fetchOpenMeteo(p.lat, p.lon, model, Math.min(hours, 24), log);
    out.push({ point: p, forecast: fc });
  }
  return out;
}

export function parsePoints(pointsStr: string): Array<{ lat: number; lon: number }> {
  const nums = pointsStr.split(',').map((s) => Number(s.trim()));
  const out: Array<{ lat: number; lon: number }> = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    out.push({ lat: nums[i] ?? 0, lon: nums[i + 1] ?? 0 });
  }
  return out;
}
