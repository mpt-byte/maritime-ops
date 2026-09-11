import { create } from 'zustand';
import type { VesselPosition, WeatherPoint } from '../types/index';

export type ViewMode = 'live' | 'voyage' | 'fleet' | 'weather';

interface AppState {
  selectedMmsi: number | null;
  setSelectedMmsi: (m: number | null) => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  weatherModel: string;
  setWeatherModel: (m: string) => void;
  weatherLayer: string;
  setWeatherLayer: (l: string) => void;
  showWeather: boolean;
  setShowWeather: (b: boolean) => void;
  showDensity: boolean;
  setShowDensity: (b: boolean) => void;
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
  showWeather: false,
  setShowWeather: (b) => set({ showWeather: b }),
  showDensity: false,
  setShowDensity: (b) => set({ showDensity: b }),
  playbackPositions: [],
  setPlaybackPositions: (p) => set({ playbackPositions: p, playbackIndex: 0 }),
  playbackIndex: 0,
  setPlaybackIndex: (i) => set({ playbackIndex: i }),
  lastWeather: null,
  setLastWeather: (w) => set({ lastWeather: w }),
  selectedVesselPosition: null,
  setSelectedVesselPosition: (p) => set({ selectedVesselPosition: p }),
}));
