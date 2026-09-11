export interface Vessel {
  mmsi: number;
  imo?: number;
  name?: string;
  callsign?: string;
  ship_type?: number;
  flag?: string;
  length?: number;
  width?: number;
  draught?: number;
  gross_tonnage?: number;
  photo_url?: string;
  updated_at?: string;
}

export interface VesselPosition {
  mmsi: number;
  timestamp: string;
  lat: number;
  lon: number;
  sog?: number;
  cog?: number;
  heading?: number;
  nav_status?: number;
  draught?: number;
  destination?: string;
  eta?: string;
  source?: string;
}

export type VesselStatus = 'unknown' | 'stopped' | 'in_port' | 'underway';

export interface FleetVessel extends Vessel {
  group_id?: number;
  group_name?: string;
  color?: string;
  status: VesselStatus;
  last_position: VesselPosition | null;
}

export interface FleetGroup {
  id: number;
  name: string;
  description?: string;
  color?: string;
  vessel_count?: number;
}

export interface Voyage {
  id: number;
  mmsi: number;
  start_time: string;
  end_time?: string;
  start_port?: string;
  end_port?: string;
  distance_nm?: number;
  avg_speed?: number;
  max_speed?: number;
  min_speed?: number;
  duration_hours?: number;
  status?: string;
}

export interface VoyageSummary {
  mmsi: number;
  start_time: string;
  end_time: string;
  distance_nm: number;
  duration_hours: number;
  avg_speed: number;
  min_speed: number;
  max_speed: number;
  stops: Array<{ start: string; end: string; lat: number; lon: number; hours: number }>;
  positions: Array<{ timestamp: string; lat: number; lon: number; sog?: number; cog?: number }>;
}

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

export interface Alert {
  id: number;
  mmsi: number;
  alert_type: string;
  severity: string;
  message?: string;
  created_at: string;
  acknowledged_at?: string;
  vessel_name?: string;
}

export interface AlertRule {
  id?: number;
  name: string;
  alert_type: 'speed' | 'zone_enter' | 'zone_exit' | 'long_stop' | 'route_deviation';
  mmsi?: number;
  group_id?: number;
  config: Record<string, unknown>;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

export const SHIP_TYPES: Record<number, string> = {
  0: 'Not available',
  20: 'Wing in ground',
  30: 'Fishing',
  31: 'Towing',
  32: 'Towing (large)',
  33: 'Dredging',
  34: 'Diving',
  35: 'Military',
  36: 'Sailing',
  37: 'Pleasure craft',
  40: 'High-speed craft',
  50: 'Pilot vessel',
  51: 'Search and rescue',
  52: 'Tug',
  53: 'Port tender',
  54: 'Anti-pollution',
  55: 'Law enforcement',
  58: 'Medical transport',
  59: 'Noncombatant',
  60: 'Passenger',
  70: 'Cargo',
  80: 'Tanker',
  90: 'Other',
};

export const NAV_STATUS: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  4: 'Constrained by draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  15: 'Not defined',
};
