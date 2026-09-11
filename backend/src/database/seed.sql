-- Maritime Ops - seed data (sample fleet groups + alert rules + demo vessels)
-- Safe to re-run; uses ON CONFLICT to stay idempotent.

INSERT INTO fleet_groups (id, name, description, color)
VALUES
  (1, 'Tankers',     'Crude & product tankers', '#e63946'),
  (2, 'Container',   'Container ships',        '#457b9d'),
  (3, 'Fishing',     'Fishing vessels',         '#2a9d8f')
ON CONFLICT (id) DO NOTHING;

INSERT INTO alert_rules (name, alert_type, group_id, config, severity, enabled)
VALUES
  ('Tanker speed anomaly', 'speed',      1, '{"min":0,"max":25}'::jsonb, 'warning', TRUE),
  ('Container port exit',  'zone_exit',  2, '{"bbox":[-180,-90,180,90]}'::jsonb, 'info', TRUE),
  ('Fishing long stop',     'long_stop',  3, '{"hours":6}'::jsonb, 'info', TRUE)
ON CONFLICT DO NOTHING;

-- Demo vessels (MMSI range used for testing only).
INSERT INTO vessels (mmsi, imo, name, callsign, ship_type, flag, length, width, draught)
VALUES
  (247000001, 9123456, 'Demo Tanker',    '3FOB',  80, 'ITA', 180, 30, 12.0),
  (247000002, 9123457, 'Demo Container', '3FOC',  70, 'ITA', 200, 32, 13.5),
  (247000003, NULL,     'Demo Fisher',    '3FOD',  30, 'ITA',  45, 10,  5.0)
ON CONFLICT (mmsi) DO NOTHING;

INSERT INTO fleet_vessels (group_id, mmsi)
VALUES
  (1, 247000001),
  (2, 247000002),
  (3, 247000003)
ON CONFLICT DO NOTHING;
