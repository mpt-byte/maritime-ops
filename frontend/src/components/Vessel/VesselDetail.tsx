import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import type { Vessel, VesselPosition } from '../../types/index';
import { SHIP_TYPES, NAV_STATUS } from '../../types/index';
import { fmtCoord, fmtSpeed, fmtHeading, fmtDate } from '../../utils/format';
import { shipTypeBucket, SHIP_TYPE_BUCKETS } from '../../stores/fleetStore';

type Tab = 'particulars' | 'position' | 'voyage';

interface Props {
  mmsi: number;
  livePosition?: VesselPosition | null;
  onClose: () => void;
  onShowRoute: (mmsi: number) => void;
}

export function VesselDetail({ mmsi, livePosition, onClose, onShowRoute }: Props) {
  const [vessel, setVessel] = useState<(Vessel & { last_position?: VesselPosition | null }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('particulars');

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
  const bucket = pos?.ship_type ?? vessel?.ship_type;
  const bucketDef = SHIP_TYPE_BUCKETS.find((b) => b.id === shipTypeBucket(bucket));
  const displayName = vessel?.name ?? pos?.name ?? `MMSI ${mmsi}`;

  return (
    <div className="vessel-detail panel">
      <div className="detail-header">
        <div className="detail-identity">
          <span className="type-dot large" style={{ background: bucketDef?.color ?? '#6b7280' }} />
          <div className="col">
            <strong className="detail-name">{displayName}</strong>
            <span className="meta">{SHIP_TYPES[bucket ?? -1] ?? 'Unknown type'}{vessel?.flag ? ` · ${vessel.flag}` : ''}</span>
          </div>
        </div>
        <button className="modal-close" onClick={onClose} aria-label="Close">&times;</button>
      </div>

      <div className="tabs">
        <button className={tab === 'particulars' ? 'active' : ''} onClick={() => setTab('particulars')}>Particulars</button>
        <button className={tab === 'position' ? 'active' : ''} onClick={() => setTab('position')}>Position</button>
        <button className={tab === 'voyage' ? 'active' : ''} onClick={() => setTab('voyage')}>Voyage</button>
      </div>

      {error && <div className="error">{error}</div>}
      {!vessel && !error && <div className="loading">Loading…</div>}

      {vessel && tab === 'particulars' && (
        <dl className="detail-grid">
          <dt>MMSI</dt><dd>{vessel.mmsi}</dd>
          <dt>IMO</dt><dd>{vessel.imo ?? '—'}</dd>
          <dt>Callsign</dt><dd>{vessel.callsign ?? '—'}</dd>
          <dt>Flag</dt><dd>{vessel.flag ?? '—'}</dd>
          <dt>Length</dt><dd>{vessel.length != null ? `${vessel.length} m` : '—'}</dd>
          <dt>Beam</dt><dd>{vessel.width != null ? `${vessel.width} m` : '—'}</dd>
          <dt>Draught</dt><dd>{vessel.draught != null ? `${vessel.draught} m` : '—'}</dd>
          <dt>Gross tonnage</dt><dd>{vessel.gross_tonnage ?? '—'}</dd>
        </dl>
      )}

      {tab === 'position' && (
        <>
          {pos ? (
            <dl className="detail-grid">
              <dt>Position</dt><dd>{fmtCoord(pos.lat, pos.lon)}</dd>
              <dt>Speed</dt><dd>{fmtSpeed(pos.sog)}</dd>
              <dt>Heading</dt><dd>{fmtHeading(pos.heading)}</dd>
              <dt>Course</dt><dd>{fmtHeading(pos.cog)}</dd>
              <dt>Nav status</dt><dd>{NAV_STATUS[pos.nav_status ?? -1] ?? '—'}</dd>
              <dt>Updated</dt><dd>{fmtDate(pos.timestamp)}</dd>
            </dl>
          ) : (
            <div className="small muted">No recent position.</div>
          )}
        </>
      )}

      {tab === 'voyage' && (
        <>
          {pos ? (
            <dl className="detail-grid">
              <dt>Destination</dt><dd>{pos.destination ?? '—'}</dd>
              <dt>ETA</dt><dd>{fmtDate(pos.eta)}</dd>
              <dt>Draught</dt><dd>{pos.draught != null ? `${pos.draught} m` : '—'}</dd>
              <dt>Source</dt><dd>{pos.source ?? '—'}</dd>
            </dl>
          ) : (
            <div className="small muted">No voyage data.</div>
          )}
          <button className="primary detail-cta" onClick={() => onShowRoute(mmsi)}>View route & playback</button>
        </>
      )}
    </div>
  );
}
