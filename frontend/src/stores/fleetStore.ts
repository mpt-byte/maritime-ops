import { create } from 'zustand';
import type { VesselPosition, WeatherPoint } from '../types/index';

export type ViewMode = 'live' | 'voyage' | 'fleet' | 'weather';
export type MapStyleId = 'nautical' | 'satellite' | 'dark';

export type ShipTypeBucket =
  | 'cargo'
  | 'tanker'
  | 'passenger'
  | 'fishing'
  | 'pleasure'
  | 'hsc'
  | 'other';

export const SHIP_TYPE_BUCKETS: Array<{ id: ShipTypeBucket; label: string; color: string }> = [
  { id: 'cargo', label: 'Cargo', color: '#457b9d' },
  { id: 'tanker', label: 'Tanker', color: '#e63946' },
  { id: 'passenger', label: 'Passenger', color: '#9d4edd' },
  { id: 'fishing', label: 'Fishing', color: '#2a9d8f' },
  { id: 'pleasure', label: 'Pleasure', color: '#e9c46a' },
  { id: 'hsc', label: 'High-speed', color: '#f4a261' },
  { id: 'other', label: 'Other', color: '#6b7280' },
];

export function shipTypeBucket(shipType?: number): ShipTypeBucket {
  if (shipType == null) return 'other';
  if (shipType >= 80) return 'tanker';
  if (shipType >= 70 && shipType < 80) return 'cargo';
  if (shipType >= 60 && shipType < 70) return 'passenger';
  if (shipType === 30 || shipType === 37 || shipType === 36) return 'fishing';
  if (shipType === 36 || shipType === 37) return 'pleasure';
  if (shipType === 40) return 'hsc';
  return 'other';
}

interface AppState {
  selectedMmsi: number | null;
  setSelectedMmsi: (m: number | null) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  weatherModel: string;
  setWeatherModel: (m: string) => void;
  weatherLayer: string;
  setWeatherLayer: (l: string) => void;
  weatherFilter: string;
  setWeatherFilter: (f: string) => void;
  forecastDays: number;
  setForecastDays: (d: number) => void;
  showWeather: boolean;
  setShowWeather: (b: boolean) => void;
  showDensity: boolean;
  setShowDensity: (b: boolean) => void;
  showLabels: boolean;
  setShowLabels: (b: boolean) => void;
  mapStyle: MapStyleId;
  setMapStyle: (s: MapStyleId) => void;
  activeShipTypes: ShipTypeBucket[];
  toggleShipType: (b: ShipTypeBucket) => void;
  setAllShipTypes: (b: ShipTypeBucket[]) => void;
  playbackPositions: { lat: number; lon: number; timestamp?: string; sog?: number }[];
  setPlaybackPositions: (p: { lat: number; lon: number; timestamp?: string; sog?: number }[]) => void;
  playbackIndex: number;
  setPlaybackIndex: (i: number) => void;
  lastWeather: WeatherPoint | null;
  setLastWeather: (w: WeatherPoint | null) => void;
  selectedVesselPosition: VesselPosition | null;
  setSelectedVesselPosition: (p: VesselPosition | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedMmsi: null,
  setSelectedMmsi: (m) => set({ selectedMmsi: m }),
  viewMode: 'live',
  setViewMode: (v) => set({ viewMode: v }),
  weatherModel: 'best_match',
  setWeatherModel: (m) => set({ weatherModel: m }),
  weatherLayer: 'wind_speed',
  setWeatherLayer: (l) => set({ weatherLayer: l }),
  weatherFilter: 'all',
  setWeatherFilter: (f) => set({ weatherFilter: f }),
  forecastDays: 1,
  setForecastDays: (d) => set({ forecastDays: d }),
  showWeather: false,
  setShowWeather: (b) => set({ showWeather: b }),
  showDensity: false,
  setShowDensity: (b) => set({ showDensity: b }),
  showLabels: true,
  setShowLabels: (b) => set({ showLabels: b }),
  mapStyle: 'nautical',
  setMapStyle: (s) => set({ mapStyle: s }),
  activeShipTypes: [],
  toggleShipType: (b) => set((s) => {
    const cur = s.activeShipTypes;
    const next = cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b];
    return { activeShipTypes: next };
  }),
  setAllShipTypes: (b) => set({ activeShipTypes: b }),
  playbackPositions: [],
  setPlaybackPositions: (p) => set({ playbackPositions: p, playbackIndex: 0 }),
  playbackIndex: 0,
  setPlaybackIndex: (i) => set({ playbackIndex: i }),
  lastWeather: null,
  setLastWeather: (w) => set({ lastWeather: w }),
  selectedVesselPosition: null,
  setSelectedVesselPosition: (p) => set({ selectedVesselPosition: p }),
}));
