import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useAppStore } from '../../stores/fleetStore';
import { nauticalStyle } from '../../map/nauticalStyle';

export function MapView({
  onMapReady,
}: {
  onMapReady?: (map: maplibregl.Map) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const setWeatherModel = useAppStore((s) => s.setWeatherModel);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const override = import.meta.env.VITE_MAP_TILE_URL;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: override && override.trim() !== '' ? override : nauticalStyle(),
      center: [12, 45],
      zoom: 4,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.on('load', () => {
      onMapReady?.(map);
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="map-wrap" ref={containerRef} data-testid="map" onClick={() => setWeatherModel(useAppStore.getState().weatherModel)} />;
}
