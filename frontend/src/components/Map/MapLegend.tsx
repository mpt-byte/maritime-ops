import { useState } from 'react';
import { SHIP_TYPE_BUCKETS } from '../../stores/fleetStore';

export function MapLegend({ vesselCount }: { vesselCount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="map-legend">
      <button className="legend-toggle" onClick={() => setOpen((v) => !v)} aria-label="Legend">
        <InfoIcon /> {vesselCount > 0 && <span className="legend-count">{vesselCount}</span>}
      </button>
      {open && (
        <div className="legend-panel">
          <div className="layers-section-title">Vessel types</div>
          <ul className="legend-list">
            {SHIP_TYPE_BUCKETS.map((b) => (
              <li key={b.id}>
                <span className="type-dot" style={{ background: b.color }} />
                <span>{b.label}</span>
              </li>
            ))}
          </ul>
          <div className="small muted">Vessel markers are coloured by ship type.</div>
        </div>
      )}
    </div>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
