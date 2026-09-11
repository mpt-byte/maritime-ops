import { useState } from 'react';
import { useWeatherPoint } from '../../hooks/useWeatherData';
import { useAppStore } from '../../stores/fleetStore';

interface Props {
  lat?: number;
  lon?: number;
}

export function WeatherPanel({ lat, lon }: Props) {
  const model = useAppStore((s) => s.weatherModel);
  const layer = useAppStore((s) => s.weatherLayer);
  const setLayer = useAppStore((s) => s.setWeatherLayer);
  const { data, loading, error } = useWeatherPoint(lat, lon, model, 24);
  const [hour, setHour] = useState(0);

  const current = data[hour] ?? data[0];

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
        <label className="small muted">Layer</label>
        <select value={layer} onChange={(e) => setLayer(e.target.value)}>
          {['wind_speed', 'wind_dir', 'wave_height', 'wave_period', 'pressure', 'sea_temp', 'air_temp', 'precipitation', 'cloud_cover', 'humidity', 'visibility'].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
