import { z } from 'zod';

// ── Vessel / position ──
export const VesselPosition = z.object({
  mmsi: z.number().int(),
  timestamp: z.string().datetime(),
  lat: z.number(),
  lon: z.number(),
  sog: z.number().optional(),
  cog: z.number().optional(),
  heading: z.number().optional(),
  nav_status: z.number().int().optional(),
  draught: z.number().optional(),
  destination: z.string().optional(),
  eta: z.string().datetime().optional(),
  source: z.string().optional(),
});
export type VesselPosition = z.infer<typeof VesselPosition>;

export const Vessel = z.object({
  mmsi: z.number().int(),
  imo: z.number().int().optional(),
  name: z.string().optional(),
  callsign: z.string().optional(),
  ship_type: z.number().int().optional(),
  flag: z.string().optional(),
  length: z.number().optional(),
  width: z.number().optional(),
  draught: z.number().optional(),
  gross_tonnage: z.number().int().optional(),
  photo_url: z.string().optional(),
});
export type Vessel = z.infer<typeof Vessel>;

// ── Query / route param schemas ──
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

export const VesselListQuery = PaginationQuery.extend({
  q: z.string().optional(),
  ship_type: z.coerce.number().int().optional(),
  flag: z.string().optional(),
  destination: z.string().optional(),
  bbox: z.string().optional(),
  sort: z.enum(['name', 'mmsi', 'updated_at']).default('updated_at'),
});
export type VesselListQuery = z.infer<typeof VesselListQuery>;

export const PositionsQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  interval: z.enum(['raw', '1m', '5m', '1h', '6h']).default('1m'),
  limit: z.coerce.number().int().min(1).max(20000).default(2000),
});
export type PositionsQuery = z.infer<typeof PositionsQuery>;

// ── Fleet ──
export const CreateFleetGroup = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type CreateFleetGroup = z.infer<typeof CreateFleetGroup>;

export const AddFleetVessel = z.object({
  mmsi: z.number().int(),
});
export type AddFleetVessel = z.infer<typeof AddFleetVessel>;

// ── Alerts ──
export const CreateAlertRule = z.object({
  name: z.string().min(1).max(255),
  alert_type: z.enum(['speed', 'zone_enter', 'zone_exit', 'long_stop', 'route_deviation']),
  mmsi: z.number().int().optional(),
  group_id: z.number().int().optional(),
  config: z.record(z.unknown()).default({}),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  enabled: z.boolean().default(true),
});
export type CreateAlertRule = z.infer<typeof CreateAlertRule>;

// ── Weather ──
export const WeatherPointQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  model: z
    .enum(['best_match', 'ecmwf', 'gfs', 'icon', 'gfs_wave', 'icon_wave'])
    .default('best_match'),
  hours: z.coerce.number().int().min(1).max(168).default(24),
});
export type WeatherPointQuery = z.infer<typeof WeatherPointQuery>;

export const WeatherRouteQuery = z.object({
  points: z
    .string()
    .describe('Comma-separated lat,lon pairs: lat1,lon1,lat2,lon2,...'),
  model: z
    .enum(['best_match', 'ecmwf', 'gfs', 'icon', 'gfs_wave', 'icon_wave'])
    .default('best_match'),
  hours: z.coerce.number().int().min(1).max(168).default(24),
});
export type WeatherRouteQuery = z.infer<typeof WeatherRouteQuery>;

// ── Auth ──
export const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});
export type LoginBody = z.infer<typeof LoginBody>;

export const PushSubscribeBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
});
export type PushSubscribeBody = z.infer<typeof PushSubscribeBody>;
