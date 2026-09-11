import { useState } from 'react';
import { useWeatherPoint } from '../../hooks/useWeatherData';
import { useAppStore } from '../../stores/fleetStore';

interface Props {
  lat?: number;
  lon?: number;
}

interface FilterCategory {
  id: string;
  label: string;
  layers: string[];
}

const FILTERS: FilterCategory[] = [
  { id: 'all', label: 'All', layers: ['wind_speed', 'wind_dir', 'wave_height', 'wave_period', 'wave_dir', 'pressure', 'sea_temp', 'air_temp', 'precipitation', 'cloud_cover', 'humidity', 'visibility'] },
  { id: 'wind', label: 'Wind', layers: ['wind_speed', 'wind_dir'] },
  { id: 'storms', label: 'Storms', layers: ['pressure', 'precipitation', 'wind_speed'] },
  { id: 'swells', label: 'Swells', layers: ['wave_height', 'wave_period'] },
  { id: 'headseas', label: 'Head seas', layers: ['wave_height', 'wave_dir', 'wave_period'] },
  { id: 'current', label: 'Current', layers: ['sea_temp', 'wave_dir'] },
  { id: 'sea', label: 'Sea', layers: ['sea_temp', 'wave_height', 'wave_period'] },
  { id: 'sky', label: 'Sky', layers: ['cloud_cover', 'precipitation', 'humidity', 'visibility', 'air_temp'] },
];

const LAYER_LABELS: Record<string, string> = {
  wind_speed: 'Wind speed',
  wind_dir: 'Wind direction',
  wave_height: 'Wave height',
  wave_period: 'Wave period',
  wave_dir: 'Wave direction',
  pressure: 'Pressure',
  sea_temp: 'Sea temperature',
  air_temp: 'Air temperature',
  precipitation: 'Precipitation',
  cloud_cover: 'Cloud cover',
  humidity: 'Humidity',
  visibility: 'Visibility',
};

export function WeatherPanel({ lat, lon }: Props) {
  const model = useAppStore((s) => s.weatherModel);
  const layer = useAppStore((s) => s.weatherLayer);
  const setLayer = useAppStore((s) => s.setWeatherLayer);
  const filter = useAppStore((s) => s.weatherFilter);
  const setFilter = useAppStore((s) => s.setWeatherFilter);
  const { data, loading, error } = useWeatherPoint(lat, lon, model, 24);
  const [hour, setHour] = useState(0);
  const current = data[hour] ?? data[0];

  const available = FILTERS.find((f) => f.id === filter)?.layers ?? FILTERS[0]!.layers;

  return (
    <div className="weather-panel panel">
      <h3>Point forecast {lat != null ? `${lat.toFixed(2)},${lon?.toFixed(2)}` : ''}</h3>
      {lat == null && <div className="small muted">Click the map to pick a point.</div>}
      {loading && <div className="loading small">Loading…</div>}
      {error && <div className="error small">{error}</div>}
      {current && (
        <div className="detail">
          <div className="small muted">{new Date(current.timestamp).toLocaleString()} · {model}</div>
          <dl>
            <dt>Wind</dt><dd>{current.wind_speed != null ? `${current.wind_speed.toFixed(1)} m/s` : '—'} {current.wind_dir != null ? `${Math.round(current.wind_dir)}°` : ''}</dd>
            <dt>Waves</dt><dd>{current.wave_height != null ? `${current.wave_height.toFixed(1)} m` : '—'} · {current.wave_period != null ? `${current.wave_period.toFixed(0)} s` : ''}</dd>
            <dt>Pressure</dt><dd>{current.pressure != null ? `${Math.round(current.pressure)} hPa` : '—'}</dd>
            <dt>Sea temp</dt><dd>{current.sea_temp != null ? `${current.sea_temp.toFixed(1)} °C` : '—'}</dd>
            <dt>Air temp</dt><dd>{current.air_temp != null ? `${current.air_temp.toFixed(1)} °C` : '—'}</dd>
            <dt>Precip</dt><dd>{current.precipitation != null ? `${current.precipitation.toFixed(1)} mm` : '—'}</dd>
            <dt>Cloud</dt><dd>{current.cloud_cover != null ? `${Math.round(current.cloud_cover)} %` : '—'}</dd>
            <dt>Humidity</dt><dd>{current.humidity != null ? `${Math.round(current.humidity)} %` : '—'}</dd>
            <dt>Visibility</dt><dd>{current.visibility != null ? `${Math.round(current.visibility)} m` : '—'}</dd>
          </dl>
        </div>
      )}
      {data.length > 1 && (
        <>
          <input type="range" min={0} max={data.length - 1} value={hour} onChange={(e) => setHour(Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
          <div className="small muted">Hour +{hour}</div>
        </>
      )}
      <div className="col" style={{ marginTop: 8 }}>
        <label className="small muted">Filter</label>
        <div className="filter-buttons">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`filter-btn ${filter === f.id ? 'active' : ''}`}
              onClick={() => {
                setFilter(f.id);
                if (!f.layers.includes(layer)) setLayer(f.layers[0]!);
              }}
            >{f.label}</button>
          ))}
        </div>
        <label className="small muted" style={{ marginTop: 8 }}>Layer</label>
        <select value={layer} onChange={(e) => setLayer(e.target.value)}>
          {available.map((l) => (
            <option key={l} value={l}>{LAYER_LABELS[l] ?? l}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
