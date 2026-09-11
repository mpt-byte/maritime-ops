import { useEffect, useRef } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { VesselPosition } from '../../types/index';
import { shipTypeColor } from '../../utils/format';

interface Props {
  map: MLMap;
  positions: Map<number, VesselPosition>;
  selectedMmsi: number | null;
  onSelect: (m: number, pos: VesselPosition) => void;
}

const SOURCE = 'vessels-source';
const LAYER = 'vessels-layer';
const LABEL = 'vessels-label';

export function VesselLayer({ map, positions, selectedMmsi, onSelect }: Props) {
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  useEffect(() => {
    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 40,
      });
    }
    if (!map.getLayer(LAYER)) {
      map.addLayer({
        id: LAYER,
        type: 'circle',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['case', ['==', ['get', 'selected'], true], 9, 6],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      });
    }
    if (!map.getLayer(LABEL)) {
      map.addLayer({
        id: LABEL,
        type: 'symbol',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-allow-overlap': false,
        },
        paint: { 'text-color': '#e6edf7', 'text-halo-color': '#0a0f1e', 'text-halo-width': 2 },
      });
    }
    if (!map.getLayer('vessels-cluster')) {
      map.addLayer({
        id: 'vessels-cluster',
        type: 'circle',
        source: SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': ['step', ['get', 'point_count'], 14, 20, 20, 100, 26],
          'circle-color': '#0b3d91',
          'circle-stroke-color': '#4cc9f0',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'vessels-cluster-count',
        type: 'symbol',
        source: SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
        },
        paint: { 'text-color': '#ffffff' },
      });
    }

    const onClick = (e: maplibregl.MapMouseEvent & { features?: unknown[] }) => {
      const f = (e.features?.[0] ?? null) as { properties?: { mmsi?: number } } | null;
      const m = f?.properties?.mmsi;
      if (m != null) {
        const pos = positionsRef.current.get(m);
        if (pos) onSelect(m, pos);
      }
    };
    map.on('click', LAYER, onClick);
    map.on('mouseenter', LAYER, () => (map.getCanvas().style.cursor = 'pointer'));
    map.on('mouseleave', LAYER, () => (map.getCanvas().style.cursor = ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const features = Array.from(positions.values()).map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
      properties: {
        mmsi: p.mmsi,
        label: String(p.mmsi),
        color: shipTypeColor(undefined),
        selected: p.mmsi === selectedMmsi,
        sog: p.sog ?? 0,
      },
    }));
    const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features });
  }, [positions, selectedMmsi, map]);

  return null;
}
