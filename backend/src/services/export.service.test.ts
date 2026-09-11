import { describe, it, expect } from 'vitest';
import { toCsv, toKml } from './export.service.js';
import type { PositionRow } from './voyage.service.js';

describe('toCsv', () => {
  it('serialises rows with header and escaping', () => {
    const csv = toCsv([{ a: 1, b: 'x,y' }, { a: 'has"quote', b: 'ok' }]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe('1,"x,y"');
    expect(lines[2]).toBe('"has""quote",ok');
  });
  it('returns empty for no rows', () => {
    expect(toCsv([])).toBe('');
  });
});

describe('toKml', () => {
  it('builds a valid KML line string', () => {
    const positions: PositionRow[] = [
      { timestamp: new Date(0).toISOString(), lat: 43.7, lon: 7.26 },
      { timestamp: new Date(1).toISOString(), lat: 43.8, lon: 7.3 },
    ];
    const kml = toKml('Route', positions);
    expect(kml).toContain('<kml');
    expect(kml).toContain('7.26,43.7,0');
    expect(kml).toContain('7.3,43.8,0');
  });
});
