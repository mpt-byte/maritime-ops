import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import { MapView } from './components/Map/MapView';
import { VesselLayer } from './components/Map/VesselLayer';
import { WeatherLayer } from './components/Map/WeatherLayer';
import { DensityHeatmap } from './components/Map/DensityHeatmap';
import { MapLayers } from './components/Map/MapLayers';
import { MapLegend } from './components/Map/MapLegend';
import { WindParticles } from './components/Weather/WindParticles';
import { Sidebar } from './components/Common/Sidebar';
import { Toolbar } from './components/Common/Toolbar';
import { NotificationBar } from './components/Common/NotificationBar';
import { VesselSearch } from './components/Vessel/VesselSearch';
import { VesselList } from './components/Vessel/VesselList';
import { VesselDetail } from './components/Vessel/VesselDetail';
import { VoyagePlayback } from './components/Voyage/VoyagePlayback';
import { FleetDashboard } from './components/Fleet/FleetDashboard';
import { FleetGroupManager } from './components/Fleet/FleetGroupManager';
import { WeatherPanel } from './components/Weather/WeatherPanel';
import { ModelSelector } from './components/Weather/ModelSelector';
import { useAISWebSocket } from './hooks/useAISWebSocket';
import { useAppStore } from './stores/fleetStore';
import { api, isUsingOverride } from './utils/api';
import { fetchOpenMeteoPoint } from './utils/openMeteo';
import type { VesselPosition, WeatherPoint } from './types/index';

export function App() {
  const [map, setMap] = useState<MLMap | null>(null);
  const [pointWeather, setPointWeather] = useState<{ lat: number; lon: number } | undefined>();
  const [weatherData, setWeatherData] = useState<WeatherPoint[]>([]);

  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const selectedMmsi = useAppStore((s) => s.selectedMmsi);
  const setSelectedMmsi = useAppStore((s) => s.setSelectedMmsi);
  const selectedVesselPosition = useAppStore((s) => s.selectedVesselPosition);
  const setSelectedVesselPosition = useAppStore((s) => s.setSelectedVesselPosition);
  const showWeather = useAppStore((s) => s.showWeather);
  const showDensity = useAppStore((s) => s.showDensity);
  const weatherModel = useAppStore((s) => s.weatherModel);
  const weatherLayer = useAppStore((s) => s.weatherLayer);
  const forecastDays = useAppStore((s) => s.forecastDays);

  const { positions, connected, subscribe } = useAISWebSocket();

  const onSelect = useCallback((mmsi: number, pos: VesselPosition) => {
    setSelectedMmsi(mmsi);
    setSelectedVesselPosition(pos);
    map?.flyTo({ center: [pos.lon, pos.lat], zoom: Math.max(map.getZoom(), 7), duration: 600 });
  }, [map, setSelectedMmsi, setSelectedVesselPosition]);

  // Update bbox subscription on map move.
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      subscribe([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    };
    update();
    map.on('moveend', update);
    return () => { map.off('moveend', update); };
  }, [map, subscribe]);

  // Click on map (not vessel) to fetch point weather.
  useEffect(() => {
    if (!map) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      setPointWeather({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    };
    map.on('click', onClick);
    return () => { map.off('click', onClick); };
  }, [map]);

  // Fetch weather grid for current viewport when weather is visible.
  useEffect(() => {
    if (!map || !showWeather) {
      setWeatherData([]);
      return;
    }
    const load = async () => {
      const b = map.getBounds();
      const samples: WeatherPoint[] = [];
      const steps = 6;
      const useBackend = isUsingOverride();
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < steps; j++) {
          const lon = b.getWest() + ((b.getEast() - b.getWest()) * i) / (steps - 1);
          const lat = b.getSouth() + ((b.getNorth() - b.getSouth()) * j) / (steps - 1);
          try {
            if (useBackend) {
              const r = await api.weatherPoint(lat, lon, weatherModel, Math.min(168, forecastDays * 24));
              if (r.data[0]) samples.push(r.data[0]);
            } else {
              const r = await fetchOpenMeteoPoint(lat, lon, weatherModel, forecastDays);
              if (r.data[0]) samples.push(r.data[0]);
            }
          } catch {
            // ignore failures per cell
          }
        }
      }
      setWeatherData(samples);
    };
    const onMove = () => void load();
    void load();
    map.on('moveend', onMove);
    return () => { map.off('moveend', onMove); };
  }, [map, showWeather, weatherModel, forecastDays]);

  const liveSidebar = useMemo(() => (
    <>
      <VesselSearch onSelect={(m) => { setSelectedMmsi(m); setViewMode('live'); }} />
      {selectedMmsi != null ? (
        <VesselDetail
          mmsi={selectedMmsi}
          livePosition={selectedVesselPosition}
          onClose={() => { setSelectedMmsi(null); setSelectedVesselPosition(null); }}
          onShowRoute={(m) => { setSelectedMmsi(m); setViewMode('voyage'); }}
        />
      ) : (
        <div className="panel">
          <h3>Live vessels ({positions.size})</h3>
          <VesselList positions={positions} selectedMmsi={selectedMmsi} onSelect={onSelect} />
        </div>
      )}
    </>
  ), [positions, selectedMmsi, selectedVesselPosition, setSelectedMmsi, setSelectedVesselPosition, setViewMode, onSelect]);

  return (
    <div className="app">
      <Sidebar connected={connected}>
        {viewMode === 'live' && liveSidebar}
        {viewMode === 'voyage' && (
          <>
            <VesselSearch onSelect={(m) => { setSelectedMmsi(m); setViewMode('voyage'); }} />
            <div className="panel">
              <div className="small muted">
                Pick a vessel, then load its route. Use the timeline at the bottom to play back the voyage and export GeoJSON/KML/CSV.
              </div>
            </div>
          </>
        )}
        {viewMode === 'fleet' && (
          <>
            <FleetDashboard />
            <FleetGroupManager />
          </>
        )}
        {viewMode === 'weather' && (
          <>
            <ModelSelector />
            <WeatherPanel lat={pointWeather?.lat} lon={pointWeather?.lon} />
          </>
        )}
      </Sidebar>
      <div className="main">
        <MapView onMapReady={setMap} />
        {map && (
          <>
            {viewMode !== 'voyage' && (
              <VesselLayer map={map} positions={positions} selectedMmsi={selectedMmsi} onSelect={onSelect} />
            )}
            <WeatherLayer map={map} data={weatherData} layer={weatherLayer} visible={showWeather} />
            <WindParticles map={map} data={weatherData} visible={showWeather} />
            <DensityHeatmap map={map} visible={showDensity} />
            {viewMode === 'voyage' && selectedMmsi != null && (
              <VoyagePlayback map={map} mmsi={selectedMmsi} onExit={() => setViewMode('live')} />
            )}
          </>
        )}
        <MapLayers />
        <MapLegend vesselCount={positions.size} />
        <Toolbar />
        <NotificationBar onSelectVessel={(m) => { setSelectedMmsi(m); setViewMode('live'); }} />
      </div>
    </div>
  );
}
