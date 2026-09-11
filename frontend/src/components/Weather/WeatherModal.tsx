import { useEffect } from 'react';
import type { WeatherPoint } from '../../types/index';
import { WeatherChart, type SeriesDef } from './WeatherChart';

interface Props {
  open: boolean;
  onClose: () => void;
  data: WeatherPoint[];
  categoryLabel: string;
  series: SeriesDef[];
  model: string;
  lat?: number;
  lon?: number;
  days: number;
}

export function WeatherModal({ open, onClose, data, categoryLabel, series, model, lat, lon, days }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal weather-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{categoryLabel} forecast — {lat != null ? `${lat.toFixed(2)},${lon?.toFixed(2)}` : ''}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="small muted" style={{ marginBottom: 8 }}>
          {model} · {days}d · {data.length} hourly points
        </div>
        <WeatherChart data={data} series={series} height={200} />
      </div>
    </div>
  );
}
