const EARTH_R_NM = 3440.065;

export function haversineNm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_NM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDeg(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function statusFromSog(sog?: number): 'unknown' | 'stopped' | 'in_port' | 'underway' {
  if (sog == null) return 'unknown';
  if (sog < 0.5) return 'stopped';
  if (sog < 1) return 'in_port';
  return 'underway';
}

export function toGeoJsonLine(
  positions: Array<{ lat: number; lon: number; timestamp?: string; sog?: number }>,
) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'LineString' as const, coordinates: positions.map((p) => [p.lon, p.lat]) },
    properties: { timestamps: positions.map((p) => p.timestamp), sogs: positions.map((p) => p.sog) },
  };
}
