import { useState } from 'react';
import { useWeatherPoint } from '../../hooks/useWeatherData';
import { useAppStore } from '../../stores/fleetStore';
import { WeatherModal } from './WeatherModal';
import type { SeriesDef } from './WeatherChart';

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

const SERIES_BY_LAYER: Record<string, SeriesDef> = {
  wind_speed: { key: 'wind_speed', label: 'Wind speed', unit: 'm/s', color: '#2a9d8f' },
  wind_dir: { key: 'wind_dir', label: 'Wind dir', unit: '°', color: '#577590' },
  wave_height: { key: 'wave_height', label: 'Wave height', unit: 'm', color: '#1d7ec9' },
  wave_period: { key: 'wave_period', label: 'Wave period', unit: 's', color: '#76c893' },
  wave_dir: { key: 'wave_dir', label: 'Wave dir', unit: '°', color: '#577590' },
  pressure: { key: 'pressure', label: 'Pressure', unit: 'hPa', color: '#0b3d91' },
  sea_temp: { key: 'sea_temp', label: 'Sea temp', unit: '°C', color: '#e76f51' },
  air_temp: { key: 'air_temp', label: 'Air temp', unit: '°C', color: '#f4a261' },
  precipitation: { key: 'precipitation', label: 'Precip', unit: 'mm', color: '#56b4e9' },
  cloud_cover: { key: 'cloud_cover', label: 'Cloud', unit: '%', color: '#a8a8a8' },
  humidity: { key: 'humidity', label: 'Humidity', unit: '%', color: '#9d4edd' },
  visibility: { key: 'visibility', label: 'Visibility', unit: 'm', color: '#588157' },
};

export function WeatherPanel({ lat, lon }: Props) {
  const model = useAppStore((s) => s.weatherModel);
  const layer = useAppStore((s) => s.weatherLayer);
  const setLayer = useAppStore((s) => s.setWeatherLayer);
  const filter = useAppStore((s) => s.weatherFilter);
  const setFilter = useAppStore((s) => s.setWeatherFilter);
  const forecastDays = useAppStore((s) => s.forecastDays);
  const setForecastDays = useAppStore((s) => s.setForecastDays);
  const { data, loading, error, source } = useWeatherPoint(lat, lon, model, forecastDays);
  const [hour, setHour] = useState(0);
  const [chartOpen, setChartOpen] = useState(false);
  const current = data[hour] ?? data[0];

  const DAYS: Array<{ id: number; label: string }> = [
    { id: 1, label: '1d' },
    { id: 3, label: '3d' },
    { id: 5, label: '5d' },
    { id: 7, label: '7d' },
  ];

  const available = FILTERS.find((f) => f.id === filter)?.layers ?? FILTERS[0]!.layers;
  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0]!;
  const chartSeries = activeFilter.layers.map((l) => SERIES_BY_LAYER[l]).filter((s): s is SeriesDef => s != null);

  return (
    <div className="weather-panel panel">
      <h3>Point forecast {lat != null ? `${lat.toFixed(2)},${lon?.toFixed(2)}` : ''}</h3>
      {lat == null && <div className="small muted">Click the map to pick a point.</div>}
      <div className="row between" style={{ margin: '6px 0' }}>
        <div className="filter-buttons">
          {DAYS.map((d) => (
            <button
              key={d.id}
              className={`filter-btn ${forecastDays === d.id ? 'active' : ''}`}
              onClick={() => { setForecastDays(d.id); setHour(0); }}
            >{d.label}</button>
          ))}
        </div>
        <span className="small muted" title="Data source">{source === 'backend' ? 'API' : source === 'open-meteo' ? 'Open-Meteo' : ''}</span>
      </div>
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
        <button
          className="primary"
          style={{ marginTop: 8 }}
          disabled={data.length === 0}
          onClick={() => setChartOpen(true)}
        >📈 Charts ({activeFilter.label})</button>
      </div>
      <WeatherModal
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        data={data}
        categoryLabel={activeFilter.label}
        series={chartSeries}
        model={model}
        lat={lat}
        lon={lon}
        days={forecastDays}
      />
    </div>
  );
}
