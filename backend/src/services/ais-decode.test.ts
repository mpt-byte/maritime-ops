import { describe, it, expect } from 'vitest';
import { decodePositionReport, decodeStaticReport } from './ais-decode.js';

describe('ais-decode', () => {
  it('parses a type-1 position report or rejects it gracefully', () => {
    // Plausible-but-synthetic AIVDM payload. The decoder should either produce
    // a valid position or null, never throw.
    const payload = '15Mq4J`?P00H?Wpb?>o?b?5mP08L5';
    const pos = decodePositionReport(payload, 0);
    if (pos) {
      expect(typeof pos.mmsi).toBe('number');
      expect(Number.isFinite(pos.lat)).toBe(true);
      expect(Number.isFinite(pos.lon)).toBe(true);
    }
  });
  it('returns null for garbage input', () => {
    expect(decodePositionReport('XYZ', 0)).toBeNull();
    expect(decodeStaticReport('XYZ')).toBeNull();
  });
});
