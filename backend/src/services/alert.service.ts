import { query } from '../database/db.js';
import { getAllLivePositions, type PositionEnvelope } from './ais-ingestion.service.js';
import { haversineNm } from './voyage.service.js';
import type { LoggerLike } from './logger.js';

export interface AlertRuleRow {
  id: number;
  name: string;
  alert_type: string;
  mmsi: number | null;
  group_id: number | null;
  config: Record<string, unknown>;
  severity: string;
  enabled: boolean;
}

function parseBbox(bbox: unknown): { minLat: number; maxLat: number; minLon: number; maxLon: number } | null {
  if (!Array.isArray(bbox) || bbox.length < 4) return null;
  const nums = bbox.map(Number);
  const minLon = nums[0] ?? 0;
  const minLat = nums[1] ?? 0;
  const maxLon = nums[2] ?? 0;
  const maxLat = nums[3] ?? 0;
  return { minLat, maxLat, minLon, maxLon };
}

export async function listRules(): Promise<AlertRuleRow[]> {
  const r = await query('SELECT * FROM alert_rules WHERE enabled = TRUE ORDER BY id');
  return r.rows as AlertRuleRow[];
}

export async function listAlerts(limit = 100): Promise<Record<string, unknown>[]> {
  const r = await query('SELECT * FROM alerts ORDER BY created_at DESC LIMIT $1', [limit]);
  return r.rows;
}

export async function createRule(input: Omit<AlertRuleRow, 'id'>): Promise<AlertRuleRow> {
  const r = await query(
    `INSERT INTO alert_rules (name, alert_type, mmsi, group_id, config, severity, enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [input.name, input.alert_type, input.mmsi, input.group_id, JSON.stringify(input.config), input.severity, input.enabled],
  );
  return r.rows[0] as AlertRuleRow;
}

export async function acknowledgeAlert(id: number, by: string): Promise<void> {
  await query(
    'UPDATE alerts SET acknowledged_at = NOW(), acknowledged_by = $1 WHERE id = $2',
    [by, id],
  );
}

export async function evaluateAlerts(log: LoggerLike): Promise<number> {
  const rules = await listRules();
  if (rules.length === 0) return 0;
  const positions = await getAllLivePositions();
  if (positions.length === 0) return 0;
  let raised = 0;
  for (const rule of rules) {
    const matched = positions.filter((p) =>
      (rule.mmsi == null || rule.mmsi === p.mmsi) && evaluateRule(rule, p),
    );
    for (const p of matched) {
      await raiseAlert(rule, p, log);
      raised++;
    }
  }
  return raised;
}

function evaluateRule(rule: AlertRuleRow, p: PositionEnvelope): boolean {
  const cfg = rule.config;
  switch (rule.alert_type) {
    case 'speed': {
      const min = Number(cfg.min ?? 0);
      const max = Number(cfg.max ?? Infinity);
      const sog = p.sog ?? 0;
      return sog < min || sog > max;
    }
    case 'zone_enter':
    case 'zone_exit': {
      const bbox = parseBbox(cfg.bbox);
      if (!bbox) return false;
      const inside =
        p.lat >= bbox.minLat && p.lat <= bbox.maxLat &&
        p.lon >= bbox.minLon && p.lon <= bbox.maxLon;
      return rule.alert_type === 'zone_enter' ? inside : !inside;
    }
    case 'long_stop': {
      const sog = p.sog ?? 0;
      const thresholdKn = Number(cfg.min_speed ?? 0.5);
      return sog <= thresholdKn;
    }
    case 'route_deviation': {
      // Deviation requires a reference point + radius (nm) in config.
      const ref = cfg.reference as { lat?: number; lon?: number } | undefined;
      const radiusNm = Number(cfg.radius_nm ?? 10);
      if (!ref || ref.lat == null || ref.lon == null) return false;
      return haversineNm({ lat: p.lat, lon: p.lon }, { lat: ref.lat, lon: ref.lon }) > radiusNm;
    }
    default:
      return false;
  }
}

async function raiseAlert(rule: AlertRuleRow, p: PositionEnvelope, log: LoggerLike): Promise<void> {
  const message = `${rule.name}: ${rule.alert_type} for MMSI ${p.mmsi} at ${p.lat.toFixed(3)},${p.lon.toFixed(3)}`;
  try {
    await query(
      `INSERT INTO alerts (mmsi, rule_id, alert_type, severity, message, location)
       VALUES ($1,$2,$3,$4,$5, ST_MakePoint($6,$7)::geography)
       ON CONFLICT DO NOTHING`,
      [p.mmsi, rule.id, rule.alert_type, rule.severity, message, p.lon, p.lat],
    );
  } catch (err) {
    log.warn({ err, mmsi: p.mmsi }, 'failed to insert alert');
  }
}

export function startAlertEvaluator(log: LoggerLike, intervalMs = 30_000): NodeJS.Timeout {
  return setInterval(() => {
    void evaluateAlerts(log).catch((err) => log.warn({ err }, 'alert evaluator error'));
  }, intervalMs);
}
