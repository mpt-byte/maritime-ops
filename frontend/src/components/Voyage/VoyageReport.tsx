import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import type { Voyage, VoyageSummary } from '../../types/index';
import { fmtDistance, fmtDuration, fmtSpeed, fmtDate } from '../../utils/format';

interface Props {
  mmsi: number;
  voyageId: number;
  onClose: () => void;
}

export function VoyageReport({ mmsi, voyageId, onClose }: Props) {
  const [voyage, setVoyage] = useState<Voyage | null>(null);
  const [summary, setSummary] = useState<VoyageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.voyageReport(mmsi, voyageId)
      .then((r) => { if (!cancelled) { setVoyage(r.voyage); setSummary(r.summary); } })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [mmsi, voyageId]);

  return (
    <div className="panel">
      <div className="row between">
        <h3>Voyage #{voyageId} report</h3>
        <button onClick={onClose}>✕</button>
      </div>
      {error && <div className="error">{error}</div>}
      {voyage && summary && (
        <div className="detail">
          <dl>
            <dt>Start</dt><dd>{fmtDate(voyage.start_time)}</dd>
            <dt>End</dt><dd>{fmtDate(voyage.end_time)}</dd>
            <dt>Duration</dt><dd>{fmtDuration(summary.duration_hours)}</dd>
            <dt>Distance</dt><dd>{fmtDistance(summary.distance_nm)}</dd>
            <dt>Avg speed</dt><dd>{fmtSpeed(summary.avg_speed)}</dd>
            <dt>Min / Max</dt><dd>{fmtSpeed(summary.min_speed)} / {fmtSpeed(summary.max_speed)}</dd>
            <dt>Status</dt><dd>{voyage.status ?? '—'}</dd>
          </dl>
          <h3 style={{ marginTop: 10 }}>Port stops ({summary.stops.length})</h3>
          {summary.stops.length === 0 && <div className="small muted">No stops detected</div>}
          <table className="table">
            <thead><tr><th>Start</th><th>End</th><th>Hours</th></tr></thead>
            <tbody>
              {summary.stops.map((s, i) => (
                <tr key={i}>
                  <td>{fmtDate(s.start)}</td>
                  <td>{fmtDate(s.end)}</td>
                  <td>{s.hours.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row" style={{ marginTop: 10 }}>
            <button onClick={() => window.open(api.exportVoyageGeoJsonUrl(voyageId, mmsi), '_blank')}>GeoJSON</button>
            <button onClick={() => window.open(api.exportVoyageKmlUrl(voyageId, mmsi), '_blank')}>KML</button>
            <button onClick={() => window.print()}>Print / PDF</button>
          </div>
        </div>
      )}
    </div>
  );
}
