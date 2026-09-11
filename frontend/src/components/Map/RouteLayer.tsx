import { useEffect } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { VesselPosition } from '../../types/index';
import { toGeoJsonLine } from '../../utils/geo';

interface Props {
  map: MLMap;
  positions: VesselPosition[];
  colorBy?: 'speed' | 'time';
}

const SOURCE = 'route-source';
const LAYER = 'route-layer';
const POINTS = 'route-points';

function speedColor(sog?: number): string {
  if (sog == null) return '#4cc9f0';
  if (sog < 2) return '#e76f51';
  if (sog < 8) return '#f4a261';
  if (sog < 15) return '#e9c46a';
  return '#2a9d8f';
}

export function RouteLayer({ map, positions, colorBy = 'speed' }: Props) {
  useEffect(() => {
    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getLayer(LAYER)) {
      map.addLayer({
        id: LAYER,
        type: 'line',
        source: SOURCE,
        paint: {
          'line-color': colorBy === 'speed' ? ['get', 'color'] : '#4cc9f0',
          'line-width': 3,
          'line-opacity': 0.9,
        },
        layout: { 'line-join': 'round', 'line-cap': 'round' },
      });
    }
    if (!map.getLayer(POINTS)) {
      map.addLayer({
        id: POINTS,
        type: 'circle',
        source: SOURCE,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-radius': 4, 'circle-color': '#4cc9f0' },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (positions.length === 0) {
      const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    const line = toGeoJsonLine(positions);
    const pts = positions.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      properties: { color: speedColor(p.sog), sog: p.sog ?? 0, timestamp: p.timestamp },
    }));
    // For per-segment speed colouring we split into individual line features.
    const segFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    for (let i = 1; i < positions.length; i++) {
      const prev = positions[i - 1]!;
      const cur = positions[i]!;
      segFeatures.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: [[prev.lon, prev.lat], [cur.lon, cur.lat]] },
        properties: { color: speedBy(colorBy, prev, cur) },
      });
    }
    const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features: [...segFeatures, ...pts, line] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, colorBy]);

  return null;
}

function speedBy(colorBy: string, a: VesselPosition, b: VesselPosition): string {
  if (colorBy === 'time') {
    const t = new Date(b.timestamp).getTime();
    const ratio = (t % 86400000) / 86400000;
    return `hsl(${Math.round(ratio * 240)}, 80%, 55%)`;
  }
  return speedColor(b.sog ?? a.sog);
}
