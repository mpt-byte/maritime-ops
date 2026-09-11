import { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import type { WeatherPoint } from '../types/index';

export function useWeatherPoint(lat?: number, lon?: number, model = 'best_match', hours = 24) {
  const [data, setData] = useState<WeatherPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (lat == null || lon == null) {
      setData([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api.weatherPoint(lat, lon, model, hours);
      setData(r.data);
    } catch (err) {
      setError((err as Error).message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lon, model, hours]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

export const WEATHER_LAYER_OPTIONS = [
  'wind_speed', 'wind_dir', 'wave_height', 'wave_period', 'pressure',
  'sea_temp', 'air_temp', 'precipitation', 'cloud_cover', 'humidity', 'visibility',
] as const;
