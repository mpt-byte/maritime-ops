import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import type { Vessel, VesselPosition } from '../../types/index';
import { SHIP_TYPES, NAV_STATUS } from '../../types/index';
import { fmtCoord, fmtSpeed, fmtHeading, fmtDate } from '../../utils/format';

interface Props {
  mmsi: number;
  livePosition?: VesselPosition | null;
  onClose: () => void;
  onShowRoute: (mmsi: number) => void;
}

export function VesselDetail({ mmsi, livePosition, onClose, onShowRoute }: Props) {
  const [vessel, setVessel] = useState<(Vessel & { last_position?: VesselPosition | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setVessel(null);
    setError(null);
    api.vessel(mmsi)
      .then((v) => { if (!cancelled) setVessel(v); })
      .catch((e) => { if (!cancelled) setError((e as Error).message); });
    return () => { cancelled = true; };
  }, [mmsi]);

  const pos = livePosition ?? vessel?.last_position ?? null;

  return (
    <div className="panel">
      <div className="row between">
        <h3>Vessel {mmsi}</h3>
        <button onClick={onClose}>✕</button>
      </div>
      {error && <div className="error">{error}</div>}
      {!vessel && !error && <div className="loading">Loading…</div>}
      {vessel && (
        <div className="detail">
          <div className="row between">
            <strong>{vessel.name ?? 'Unknown'}</strong>
            <span className="tag">{vessel.flag ?? '—'}</span>
          </div>
          <dl>
            <dt>IMO</dt><dd>{vessel.imo ?? '—'}</dd>
            <dt>Callsign</dt><dd>{vessel.callsign ?? '—'}</dd>
            <dt>Type</dt><dd>{SHIP_TYPES[vessel.ship_type ?? -1] ?? '—'}</dd>
            <dt>Dimensions</dt><dd>{vessel.length ?? '—'} × {vessel.width ?? '—'} m</dd>
            <dt>Draught</dt><dd>{vessel.draught != null ? `${vessel.draught} m` : '—'}</dd>
            <dt>Gross tonnage</dt><dd>{vessel.gross_tonnage ?? '—'}</dd>
          </dl>
        </div>
      )}
      {pos && (
        <div className="detail" style={{ marginTop: 10 }}>
          <h3 style={{ fontSize: 12, color: 'var(--text-dim)' }}>Last position</h3>
          <dl>
            <dt>Position</dt><dd>{fmtCoord(pos.lat, pos.lon)}</dd>
            <dt>Speed</dt><dd>{fmtSpeed(pos.sog)}</dd>
            <dt>Heading</dt><dd>{fmtHeading(pos.heading)}</dd>
            <dt>Course</dt><dd>{fmtHeading(pos.cog)}</dd>
            <dt>Nav status</dt><dd>{NAV_STATUS[pos.nav_status ?? -1] ?? '—'}</dd>
            <dt>Destination</dt><dd>{pos.destination ?? '—'}</dd>
            <dt>ETA</dt><dd>{fmtDate(pos.eta)}</dd>
            <dt>Updated</dt><dd>{fmtDate(pos.timestamp)}</dd>
          </dl>
        </div>
      )}
      <div className="row" style={{ marginTop: 10 }}>
        <button className="primary" onClick={() => onShowRoute(mmsi)}>View route & playback</button>
      </div>
    </div>
  );
}
