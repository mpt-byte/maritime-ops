import { describe, it, expect } from 'vitest';
import { haversineNm, bearingDeg, statusFromSog, toGeoJsonLine } from './geo';

describe('haversineNm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineNm({ lat: 45, lon: 9 }, { lat: 45, lon: 9 })).toBe(0);
  });
  it('is symmetric', () => {
    const a = { lat: 43.7, lon: 7.26 };
    const b = { lat: 44.4, lon: 8.95 };
    expect(haversineNm(a, b)).toBeCloseTo(haversineNm(b, a), 5);
  });
});

describe('bearingDeg', () => {
  it('returns a value in [0, 360)', () => {
    const b = bearingDeg({ lat: 0, lon: 0 }, { lat: 10, lon: 10 });
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(360);
  });
  it('points east for equal latitude', () => {
    expect(bearingDeg({ lat: 0, lon: 0 }, { lat: 0, lon: 10 })).toBeCloseTo(90, 0);
  });
});

describe('statusFromSog', () => {
  it('classifies by speed', () => {
    expect(statusFromSog(0)).toBe('stopped');
    expect(statusFromSog(0.7)).toBe('in_port');
    expect(statusFromSog(12)).toBe('underway');
    expect(statusFromSog(undefined)).toBe('unknown');
  });
});

describe('toGeoJsonLine', () => {
  it('builds a LineString feature in lon,lat order', () => {
    const f = toGeoJsonLine([{ lat: 1, lon: 2, timestamp: 'a' }]);
    expect(f.type).toBe('Feature');
    expect(f.geometry.type).toBe('LineString');
    expect(f.geometry.coordinates).toEqual([[2, 1]]);
  });
});
