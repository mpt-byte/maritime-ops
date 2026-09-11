import type {
  Vessel, VesselPosition, FleetVessel, FleetGroup, Voyage, VoyageSummary,
  WeatherPoint, Alert, AlertRule,
} from '../types/index';

const API_BASE_KEY = 'mo:apiBase';
const WS_BASE_KEY = 'mo:wsBase';

const ENV_API_BASE = (import.meta.env.VITE_API_BASE ?? '/api/v1').replace(/\/$/, '');
const ENV_WS_BASE = (import.meta.env.VITE_WS_BASE ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`).replace(/\/$/, '');

function readStored(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

let apiBase = (readStored(API_BASE_KEY) ?? ENV_API_BASE).replace(/\/$/, '');
let wsBase = (readStored(WS_BASE_KEY) ?? ENV_WS_BASE).replace(/\/$/, '');

export function configureApi(opts: { apiBase?: string; wsBase?: string }): void {
  if (opts.apiBase != null && opts.apiBase !== '') {
    apiBase = opts.apiBase.replace(/\/$/, '');
    try { localStorage.setItem(API_BASE_KEY, apiBase); } catch { /* ignore */ }
  }
  if (opts.wsBase != null && opts.wsBase !== '') {
    wsBase = opts.wsBase.replace(/\/$/, '');
    try { localStorage.setItem(WS_BASE_KEY, wsBase); } catch { /* ignore */ }
  }
}

export function resetApi(): void {
  apiBase = ENV_API_BASE;
  wsBase = ENV_WS_BASE;
  try { localStorage.removeItem(API_BASE_KEY); localStorage.removeItem(WS_BASE_KEY); } catch { /* ignore */ }
}

export function inferWsFromApi(api: string): string {
  try {
    if (/^wss?:\/\//.test(api)) return api.replace(/\/$/, '');
    const u = new URL(api);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = u.pathname.replace(/\/api\/v\d+\/?$/, '') + '/ws';
    return u.toString().replace(/\/$/, '');
  } catch {
    return api.replace(/^http/, 'ws').replace(/\/api\/v\d+$/, '/ws').replace(/\/$/, '');
  }
}

export function currentApiBase(): string { return apiBase; }
export function currentWsBase(): string { return wsBase; }
export function isUsingOverride(): boolean {
  return readStored(API_BASE_KEY) != null || readStored(WS_BASE_KEY) != null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`);
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  base: () => apiBase,
  wsBase: () => wsBase,
  configure: configureApi,
  reset: resetApi,
  isOverride: isUsingOverride,
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
  exportVesselsCsvUrl: () => `${apiBase}/export/vessels.csv`,
  exportVoyageGeoJsonUrl: (id: number, mmsi: number) => `${apiBase}/export/voyages/${id}.geojson?mmsi=${mmsi}`,
  exportVoyageKmlUrl: (id: number, mmsi: number) => `${apiBase}/export/voyages/${id}.kml?mmsi=${mmsi}`,
  exportDensityUrl: () => `${apiBase}/export/density.geojson`,
};
