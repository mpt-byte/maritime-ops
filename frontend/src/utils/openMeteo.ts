import type { WeatherPoint } from '../types/index';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

const MODEL_TO_OM: Record<string, string> = {
  best_match: 'best_match',
  ecmwf: 'ecmwf',
  gfs: 'gfs',
  icon: 'icon',
  gfs_wave: 'gfs_seamless',
  icon_wave: 'icon_seamless',
};

const HOURLY_VARS = [
  'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m',
  'wave_height', 'wave_period', 'wave_direction',
  'pressure_msl', 'sea_surface_temperature',
  'temperature_2m', 'precipitation', 'cloud_cover',
  'relative_humidity_2m', 'visibility',
].join(',');

export interface OpenMeteoResult {
  data: WeatherPoint[];
  source: 'open-meteo';
}

export async function fetchOpenMeteoPoint(
  lat: number,
  lon: number,
  model: string,
  days: number,
): Promise<OpenMeteoResult> {
  const omModel = MODEL_TO_OM[model] ?? 'best_match';
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: HOURLY_VARS,
    models: omModel,
    forecast_days: String(Math.max(1, Math.min(7, Math.round(days)))),
    timezone: 'UTC',
  });
  const url = `${OPEN_METEO_BASE}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = (await res.json()) as Record<string, unknown>;
  const hourly = (j.hourly ?? {}) as Record<string, unknown[] | undefined>;
  const times = (hourly.time ?? []) as string[];
  const pick = (k: string): number[] => (hourly[k] as number[] | undefined) ?? [];
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
  const out: WeatherPoint[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i] ?? '';
    const idx = i;
    out.push({
      lat,
      lon,
      model,
      timestamp: t,
      wind_speed: ws[idx] as number | undefined,
      wind_dir: wd[idx] as number | undefined,
      wave_height: wh[idx] as number | undefined,
      wave_period: wp[idx] as number | undefined,
      wave_dir: wdir[idx] as number | undefined,
      pressure: p[idx] as number | undefined,
      air_temp: at[idx] as number | undefined,
      sea_temp: sst[idx] as number | undefined,
      precipitation: pr[idx] as number | undefined,
      cloud_cover: cc[idx] as number | undefined,
      humidity: rh[idx] as number | undefined,
      visibility: vis[idx] as number | undefined,
    });
  }
  return { data: out, source: 'open-meteo' };
}
