import type {
  Vessel, VesselPosition, FleetVessel, FleetGroup, Voyage, VoyageSummary,
  WeatherPoint, Alert, AlertRule,
} from '../types/index';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api/v1').replace(/\/$/, '');
const WS_BASE = (import.meta.env.VITE_WS_BASE ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`).replace(/\/$/, '');

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  base: API_BASE,
  wsBase: WS_BASE,
  health: () => get<{ status: string; db: boolean; redis: boolean }>('/health'),
  vessels: (params: Record<string, string | number> = {}) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    return get<{ total: number; data: Vessel[] }>(`/vessels?${qs}`);
  },
  vessel: (mmsi: number) => get<Vessel & { last_position: VesselPosition | null }>(`/vessels/${mmsi}`),
  livePositions: () => get<{ total: number; data: VesselPosition[] }>('/vessels/live'),
  positions: (mmsi: number, from?: string, to?: string, interval = '1m', limit = 2000) => {
    const qs = new URLSearchParams({ interval, limit: String(limit) });
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return get<{ total: number; data: VesselPosition[] }>(`/vessels/${mmsi}/positions?${qs}`);
  },
  voyages: (mmsi: number) => get<{ data: Voyage[] }>(`/vessels/${mmsi}/voyages`),
  voyageReport: (mmsi: number, id: number) => get<{ voyage: Voyage; summary: VoyageSummary }>(`/vessels/${mmsi}/voyages/${id}/report`),
  forecast: (mmsi: number, lat?: number, lon?: number) => get<{ mmsi: number; eta: string | null; predicted_distance_nm: number; avg_speed: number }>(`/vessels/${mmsi}/forecast${lat != null ? `?lat=${lat}&lon=${lon}` : ''}`),
  fleet: () => get<{ total: number; data: FleetVessel[] }>('/fleet'),
  fleetStats: () => get<{ total: number; underway: number; stopped: number; in_port: number }>('/fleet/stats'),
  fleetGroups: () => get<{ data: FleetGroup[] }>('/fleet/groups'),
  createFleetGroup: (g: { name: string; description?: string; color?: string }) => post<FleetGroup>('/fleet/groups', g),
  addFleetVessel: (groupId: number, mmsi: number) => post(`/fleet/groups/${groupId}/vessels`, { mmsi }),
  alerts: (limit = 100) => get<{ total: number; data: Alert[] }>(`/alerts?limit=${limit}`),
  alertRules: () => get<{ data: AlertRule[] }>('/alerts/rules'),
  createAlertRule: (r: AlertRule) => post<AlertRule>('/alerts/rules', r),
  weatherPoint: (lat: number, lon: number, model = 'best_match', hours = 24) =>
    get<{ data: WeatherPoint[] }>(`/weather/point?lat=${lat}&lon=${lon}&model=${model}&hours=${hours}`),
  weatherLayers: () => get<{ models: Record<string, string>; layers: Array<{ id: string; label: string; unit: string }> }>('/weather/layers'),
  weatherRoute: (points: string, model = 'best_match', hours = 24) =>
    get(`/weather/route?points=${points}&model=${model}&hours=${hours}`),
  exportVesselsCsvUrl: () => `${API_BASE}/export/vessels.csv`,
  exportVoyageGeoJsonUrl: (id: number, mmsi: number) => `${API_BASE}/export/voyages/${id}.geojson?mmsi=${mmsi}`,
  exportVoyageKmlUrl: (id: number, mmsi: number) => `${API_BASE}/export/voyages/${id}.kml?mmsi=${mmsi}`,
  exportDensityUrl: () => `${API_BASE}/export/density.geojson`,
};
