import { describe, it, expect } from 'vitest';
import { haversineNm, summarizeVoyage, forecastRoute, type PositionRow } from './voyage.service.js';

describe('haversineNm', () => {
  it('returns 0 for the same point', () => {
    expect(haversineNm({ lat: 43, lon: 7 }, { lat: 43, lon: 7 })).toBe(0);
  });
  it('matches the great-circle distance between Nice and Genoa (~84 nm)', () => {
    const nice = { lat: 43.7034, lon: 7.2663 };
    const genoa = { lat: 44.4056, lon: 8.9463 };
    const d = haversineNm(nice, genoa);
    expect(d).toBeGreaterThan(80);
    expect(d).toBeLessThan(90);
  });
});

describe('summarizeVoyage', () => {
  function mk(rows: Array<[number, number, number, number?]>): PositionRow[] {
    return rows.map(([t, lat, lon, sog]) => ({
      timestamp: new Date(t).toISOString(),
      lat,
      lon,
      sog,
    }));
  }

  it('computes distance, duration and stops', () => {
    const positions = mk([
      [0, 43.7, 7.26, 10],
      [60_000, 43.72, 7.30, 10],
      [120_000, 43.74, 7.34, 0],
      [3_600_000 * 3, 43.74, 7.34, 0], // 3h stop
      [3_600_000 * 3 + 60_000, 43.76, 7.38, 10],
    ]);
    const s = summarizeVoyage(123, positions);
    expect(s.distance_nm).toBeGreaterThan(0);
    expect(s.duration_hours).toBeGreaterThan(3);
    expect(s.stops.length).toBe(1);
    expect(s.stops[0]?.hours).toBeGreaterThanOrEqual(2);
  });

  it('handles empty input', () => {
    const s = summarizeVoyage(1, []);
    expect(s.distance_nm).toBe(0);
    expect(s.stops).toEqual([]);
  });
});

describe('forecastRoute', () => {
  it('returns zeros for empty positions', () => {
    const f = forecastRoute(1, []);
    expect(f.eta).toBeNull();
    expect(f.predicted_distance_nm).toBe(0);
  });

  it('estimates ETA from history', () => {
    const positions: PositionRow[] = [
      { timestamp: new Date(0).toISOString(), lat: 43.7, lon: 7.26, sog: 10 },
      { timestamp: new Date(3_600_000).toISOString(), lat: 43.9, lon: 7.5, sog: 10 },
    ];
    const f = forecastRoute(1, positions, 44.1, 7.7);
    expect(f.avg_speed).toBeGreaterThan(0);
    expect(f.eta).not.toBeNull();
  });
});
