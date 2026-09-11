import { useEffect } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { WeatherPoint } from '../../types/index';

interface Props {
  map: MLMap;
  data: WeatherPoint[];
  layer: string;
  visible: boolean;
}

const SOURCE = 'weather-source';
const LAYER = 'weather-fill';

const LAYER_FIELD: Record<string, keyof WeatherPoint> = {
  wind_speed: 'wind_speed',
  wave_height: 'wave_height',
  pressure: 'pressure',
  sea_temp: 'sea_temp',
  air_temp: 'air_temp',
  precipitation: 'precipitation',
  cloud_cover: 'cloud_cover',
  humidity: 'humidity',
  visibility: 'visibility',
};

function colorRamp(layer: string): Array<[number, string]> {
  switch (layer) {
    case 'wind_speed': return [[0, '#2a9d8f'], [10, '#e9c46a'], [20, '#f4a261'], [30, '#e63946']];
    case 'wave_height': return [[0, '#2a9d8f'], [2, '#e9c46a'], [5, '#f4a261'], [8, '#e63946']];
    case 'pressure': return [[990, '#0b3d91'], [1010, '#4cc9f0'], [1015, '#e9c46a'], [1030, '#e63946']];
    case 'sea_temp': return [[0, '#0b3d91'], [10, '#4cc9f0'], [20, '#e9c46a'], [30, '#e63946']];
    default: return [[0, '#2a9d8f'], [50, '#e9c46a'], [100, '#f4a261'], [1000, '#e63946']];
  }
}

export function WeatherLayer({ map, data, layer, visible }: Props) {
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
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.55,
          'circle-stroke-width': 0,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const field = LAYER_FIELD[layer] ?? 'wind_speed';
    const ramp = colorRamp(layer);
    const features = data.map((p) => {
      const val = (p[field] as number | undefined) ?? 0;
      const color = ramp.find((r) => val <= r[0])?.[1] ?? ramp[ramp.length - 1]![1];
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] },
        properties: { value: val, color, layer, timestamp: p.timestamp },
      };
    });
    const src = map.getSource(SOURCE) as maplibregl.GeoJSONSource | undefined;
    src?.setData({ type: 'FeatureCollection', features });
  }, [data, layer, map]);

  useEffect(() => {
    map.setLayoutProperty(LAYER, 'visibility', visible ? 'visible' : 'none');
  }, [visible, map]);

  return null;
}
