import { useEffect, useRef } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { VesselPosition } from '../../types/index';
import { useAppStore, shipTypeBucket, SHIP_TYPE_BUCKETS, type ShipTypeBucket } from '../../stores/fleetStore';

interface Props {
  map: MLMap;
  positions: Map<number, VesselPosition>;
  selectedMmsi: number | null;
  onSelect: (m: number, pos: VesselPosition) => void;
}

const SOURCE = 'vessels-source';
const LAYER = 'vessels-layer';
const LAYER_SEL = 'vessels-selected';
const LABEL = 'vessels-label';
const ICON = 'vessel-arrow';

const BUCKET_COLOR: Record<ShipTypeBucket, string> = Object.fromEntries(
  SHIP_TYPE_BUCKETS.map((b) => [b.id, b.color]),
) as Record<ShipTypeBucket, string>;

function vesselIcon(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 1 L18 22 L12 17 L6 22 Z" fill="#ffffff" stroke="#0a0f1e" stroke-width="1"/></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function VesselLayer({ map, positions, selectedMmsi, onSelect }: Props) {
  const positionsRef = useRef(positions);
  positionsRef.current = positions;
  const showLabels = useAppStore((s) => s.showLabels);
  const activeShipTypes = useAppStore((s) => s.activeShipTypes);

  useEffect(() => {
    if (!map.hasImage(ICON)) {
      map.loadImage(vesselIcon())
        .then((res) => {
          if (!map.hasImage(ICON)) map.addImage(ICON, res.data);
        })
        .catch(() => {});
    }
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
        type: 'symbol',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ICON,
          'icon-size': ['case', ['==', ['get', 'selected'], true], 1.15, 0.7],
          'icon-rotate': ['coalesce', ['get', 'heading'], 0],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': false,
        },
        paint: {
          'icon-opacity': ['case', ['get', 'visible'], 1, 0],
        },
      });
    }
    if (!map.getLayer(LAYER_SEL)) {
      map.addLayer({
        id: LAYER_SEL,
        type: 'circle',
        source: SOURCE,
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'selected'], true]],
        paint: {
          'circle-radius': 12,
          'circle-color': '#4cc9f0',
          'circle-opacity': 0.12,
          'circle-stroke-color': '#4cc9f0',
          'circle-stroke-width': 2,
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
          'text-size': 11,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': false,
          'visibility': showLabels ? 'visible' : 'none',
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
        layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
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
    map.on('click', 'vessels-cluster', (e: maplibregl.MapMouseEvent & { features?: unknown[] }) => {
      const f = (e.features?.[0] ?? null) as { properties?: { cluster_id?: number } } | null;
      const cid = f?.properties?.cluster_id;
      const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
      if (cid != null && src) {
        src.getClusterExpansionZoom(cid).then((zoom) => {
          const feat = (e.features?.[0] ?? null) as { geometry?: { coordinates?: [number, number] } } | null;
          const c = feat?.geometry?.coordinates;
          if (c) map.flyTo({ center: c, zoom, duration: 400 });
        }).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.setLayoutProperty(LABEL, 'visibility', showLabels ? 'visible' : 'none');
  }, [showLabels, map]);

  useEffect(() => {
    const filterActive = activeShipTypes.length > 0;
    const features = Array.from(positions.values()).map((p) => {
      const bucket = shipTypeBucket(p.ship_type);
      const visible = !filterActive || activeShipTypes.includes(bucket);
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
        properties: {
          mmsi: p.mmsi,
          label: p.name ?? `MMSI ${p.mmsi}`,
          color: BUCKET_COLOR[bucket],
          bucket,
          selected: p.mmsi === selectedMmsi,
          heading: p.heading ?? p.cog ?? 0,
          sog: p.sog ?? 0,
          visible,
        },
      };
    });
    const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features });
  }, [positions, selectedMmsi, map, activeShipTypes]);

  return null;
}
