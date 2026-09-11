import { useEffect, useRef, useState } from 'react';
import { api } from '../../utils/api';
import type { VesselPosition, Voyage } from '../../types/index';
import { RouteLayer } from '../Map/RouteLayer';
import type { Map as MLMap } from 'maplibre-gl';

interface Props {
  map: MLMap;
  mmsi: number;
  onExit: () => void;
}

const SPEEDS = [1, 2, 5, 10] as const;

export function VoyagePlayback({ map, mmsi, onExit }: Props) {
  const [positions, setPositions] = useState<VesselPosition[]>([]);
  const [voyages, setVoyages] = useState<Voyage[]>([]);
  const [voyageId, setVoyageId] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(2);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    api.voyages(mmsi).then((r) => setVoyages(r.data)).catch((e) => setError((e as Error).message));
  }, [mmsi]);

  const loadPositions = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await api.positions(mmsi, from || undefined, to || undefined, '1m', 10000);
      setPositions(r.data);
      setIndex(0);
      setPlaying(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!playing || positions.length === 0) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => {
        if (i >= positions.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1000 / speed);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [playing, positions.length, speed]);

  useEffect(() => {
    if (positions.length > 0) {
      const p = positions[index] ?? positions[positions.length - 1]!;
      map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 6), duration: 500 });
    }
  }, [index, positions, map]);

  const exportCsv = () => {
    const header = 'timestamp,lat,lon,sog,cog,heading,nav_status,destination';
    const rows = positions.map((p) => [p.timestamp, p.lat, p.lon, p.sog ?? '', p.cog ?? '', p.heading ?? '', p.nav_status ?? '', p.destination ?? ''].join(','));
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    download(blob, `voyage-${mmsi}.csv`);
  };

  const exportVoyageGeoJson = () => {
    if (voyageId == null) return;
    window.open(api.exportVoyageGeoJsonUrl(voyageId, mmsi), '_blank');
  };

  const exportVoyageKml = () => {
    if (voyageId == null) return;
    window.open(api.exportVoyageKmlUrl(voyageId, mmsi), '_blank');
  };

  return (
    <>
      <RouteLayer map={map} positions={positions.slice(0, index + 1)} colorBy="speed" />
      <div className="timeline">
        <div className="row between" style={{ marginBottom: 8 }}>
          <strong>Playback · MMSI {mmsi}</strong>
          <button onClick={onExit}>Exit playback</button>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          <input type="datetime-local" value={from ? toLocalInput(from) : ''} onChange={(e) => setFrom(e.target.value ? new Date(e.target.value).toISOString() : '')} />
          <input type="datetime-local" value={to ? toLocalInput(to) : ''} onChange={(e) => setTo(e.target.value ? new Date(e.target.value).toISOString() : '')} />
          <button className="primary" onClick={loadPositions} disabled={loading}>{loading ? 'Loading…' : 'Load route'}</button>
        </div>
        {voyages.length > 0 && (
          <div className="row" style={{ marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
            <select value={voyageId ?? ''} onChange={(e) => setVoyageId(Number(e.target.value))}>
              <option value="">Voyage…</option>
              {voyages.map((v) => (
                <option key={v.id} value={v.id}>#{v.id} · {new Date(v.start_time).toLocaleDateString()}</option>
              ))}
            </select>
            <button onClick={exportVoyageGeoJson} disabled={voyageId == null}>GeoJSON</button>
            <button onClick={exportVoyageKml} disabled={voyageId == null}>KML</button>
            <button onClick={exportCsv} disabled={positions.length === 0}>CSV</button>
          </div>
        )}
        {error && <div className="error small">{error}</div>}
        {positions.length > 0 && (
          <>
            <input
              type="range"
              min={0}
              max={positions.length - 1}
              value={index}
              onChange={(e) => setIndex(Number(e.target.value))}
              style={{ marginTop: 8 }}
            />
            <div className="row between small muted" style={{ marginTop: 4 }}>
              <span>{new Date(positions[index]?.timestamp ?? 0).toLocaleString()}</span>
              <span>{index + 1}/{positions.length}</span>
            </div>
            <div className="controls" style={{ marginTop: 6 }}>
              <button onClick={() => setIndex(0)}>⏮</button>
              <button onClick={() => setPlaying((p) => !p)}>{playing ? '⏸' : '▶'}</button>
              {SPEEDS.map((s) => (
                <button key={s} className={speed === s ? 'active' : ''} onClick={() => setSpeed(s)}>{s}x</button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
