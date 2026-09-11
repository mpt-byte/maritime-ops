import { useEffect, useState, useCallback } from 'react';
import { api } from '../utils/api';
import type { VesselPosition } from '../types/index';

export function useVesselPositions(
  mmsi: number | null,
  from?: string,
  to?: string,
  interval: 'raw' | '1m' | '5m' | '1h' | '6h' = '1m',
  limit = 2000,
) {
  const [positions, setPositions] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (mmsi == null) {
      setPositions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api.positions(mmsi, from, to, interval, limit);
      setPositions(r.data);
    } catch (err) {
      setError((err as Error).message);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [mmsi, from, to, interval, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { positions, loading, error, reload: load };
}
