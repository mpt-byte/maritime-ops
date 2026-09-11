import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().default('postgres://maritime:change-me-in-production@localhost:5432/maritime'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  BACKEND_HOST: z.string().default('0.0.0.0'),
  BACKEND_PORT: z.coerce.number().default(4000),
  BACKEND_LOG_LEVEL: z.string().default('info'),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  JWT_SECRET: z.string().default('replace-with-a-long-random-string'),
  JWT_AUDIENCE: z.string().default('maritime-ops'),
  JWT_ISSUER: z.string().default('maritime-ops'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('change-me-admin'),
  AISSTREAM_API_KEY: z.string().default(''),
  AISSTREAM_BBOXES: z.string().default('-180,-90,180,90'),
  AISSTREAM_ENABLED: z
    .string()
    .default('true')
    .transform((v) => v === 'true'),
  AISHUB_API_KEY: z.string().default(''),
  AISHUB_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  AISHUB_POLL_INTERVAL_MS: z.coerce.number().default(60_000),
  NMEA_ENABLED: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NMEA_UDP_PORT: z.coerce.number().default(10110),
  NMEA_TCP_HOST: z.string().default(''),
  NMEA_TCP_PORT: z.coerce.number().default(0),
  OPEN_METEO_API_KEY: z.string().default(''),
  OPEN_METEO_BASE_URL: z.string().default('https://api.open-meteo.com/v1'),
  OPEN_METEO_CACHE_TTL_MS: z.coerce.number().default(3_600_000),
  OPENWEATHER_API_KEY: z.string().default(''),
  OPENWEATHER_BASE_URL: z.string().default('https://api.openweathermap.org'),
  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default('mailto:admin@example.com'),
  PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
  DEMO_MODE: z
    .string()
    .default('auto')
    .transform((v) => v),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cached: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }
  cached = parsed.data;
  return cached;
}

export function isDemoMode(config: AppConfig): boolean {
  if (config.DEMO_MODE === 'true') return true;
  if (config.DEMO_MODE === 'false') return false;
  return !config.AISSTREAM_ENABLED || config.AISSTREAM_API_KEY.trim() === '';
}
