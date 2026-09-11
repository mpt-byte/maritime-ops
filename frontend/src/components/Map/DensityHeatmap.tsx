import { useEffect } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { api } from '../../utils/api';

interface Props {
  map: MLMap;
  from?: string;
  to?: string;
  visible: boolean;
}

const SOURCE = 'density-source';
const LAYER = 'density-heat';
const LAYER_C = 'density-heat-count';

export function DensityHeatmap({ map, from, to, visible }: Props) {

  useEffect(() => {
    if (!map.getSource(SOURCE)) {
      map.addSource(SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getLayer(LAYER)) {
      map.addLayer({
        id: LAYER,
        type: 'circle',
        source: SOURCE,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'vessels'], 1, 4, 50, 18, 500, 40],
          'circle-color': ['interpolate', ['linear'], ['get', 'vessels'], 1, '#2a9d8f', 50, '#f4a261', 500, '#e63946'],
          'circle-opacity': 0.55,
          'circle-blur': 0.6,
        },
      });
      map.addLayer({
        id: LAYER_C,
        type: 'symbol',
        source: SOURCE,
        layout: { 'text-field': '{vessels}', 'text-size': 11 },
        paint: { 'text-color': '#fff', 'text-halo-color': '#000', 'text-halo-width': 1 },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!visible) {
      map.setLayoutProperty(LAYER, 'visibility', 'none');
      map.setLayoutProperty(LAYER_C, 'visibility', 'none');
      return;
    }
    map.setLayoutProperty(LAYER, 'visibility', 'visible');
    map.setLayoutProperty(LAYER_C, 'visibility', 'visible');
    void loadDensity(map, from, to);
  }, [visible, from, to, map]);

  return null;
}

async function loadDensity(map: MLMap, from?: string, to?: string): Promise<void> {
  const url = api.exportDensityUrl() + (from ? `?from=${encodeURIComponent(from)}` : '') + (to ? `&to=${encodeURIComponent(to)}` : '');
  const res = await fetch(url);
  if (!res.ok) return;
  const geo = (await res.json()) as GeoJSON.FeatureCollection<GeoJSON.Point>;
  const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
  src?.setData(geo);
}
