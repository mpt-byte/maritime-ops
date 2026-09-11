import { useEffect, useState, useCallback } from 'react';
import { api, isUsingOverride } from '../utils/api';
import { fetchOpenMeteoPoint } from '../utils/openMeteo';
import type { WeatherPoint } from '../types/index';

export interface WeatherResult {
  data: WeatherPoint[];
  loading: boolean;
  error: string | null;
  source: 'backend' | 'open-meteo' | null;
  reload: () => void;
}

export function useWeatherPoint(lat?: number, lon?: number, model = 'best_match', days = 1): WeatherResult {
  const [data, setData] = useState<WeatherPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'backend' | 'open-meteo' | null>(null);

  const load = useCallback(async () => {
    if (lat == null || lon == null) {
      setData([]);
      setSource(null);
      return;
    }
    setLoading(true);
    setError(null);
    // Prefer a configured backend when one is set; otherwise call Open-Meteo
    // directly (free, no key, CORS-enabled) so the static demo gets forecasts.
    if (isUsingOverride()) {
      try {
        const r = await api.weatherPoint(lat, lon, model, Math.min(168, days * 24));
        setData(r.data);
        setSource('backend');
        return;
      } catch (err) {
        // fall through to direct Open-Meteo
      }
    }
    try {
      const r = await fetchOpenMeteoPoint(lat, lon, model, days);
      setData(r.data);
      setSource('open-meteo');
    } catch (err) {
      setError((err as Error).message);
      setData([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, model, days]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, source, reload: () => void load() };
}

export const WEATHER_LAYER_OPTIONS = [
  'wind_speed', 'wind_dir', 'wave_height', 'wave_period', 'pressure',
  'sea_temp', 'air_temp', 'precipitation', 'cloud_cover', 'humidity', 'visibility',
] as const;
