import { useState } from 'react';
import { useAppStore, SHIP_TYPE_BUCKETS, type MapStyleId, type ShipTypeBucket } from '../../stores/fleetStore';

const MAP_STYLES: Array<{ id: MapStyleId; label: string }> = [
  { id: 'nautical', label: 'Nautical' },
  { id: 'satellite', label: 'Satellite' },
  { id: 'dark', label: 'Dark' },
];

export function MapLayers() {
  const showWeather = useAppStore((s) => s.showWeather);
  const setShowWeather = useAppStore((s) => s.setShowWeather);
  const showDensity = useAppStore((s) => s.showDensity);
  const setShowDensity = useAppStore((s) => s.setShowDensity);
  const showLabels = useAppStore((s) => s.showLabels);
  const setShowLabels = useAppStore((s) => s.setShowLabels);
  const mapStyle = useAppStore((s) => s.mapStyle);
  const setMapStyle = useAppStore((s) => s.setMapStyle);
  const activeShipTypes = useAppStore((s) => s.activeShipTypes);
  const toggleShipType = useAppStore((s) => s.toggleShipType);
  const setAllShipTypes = useAppStore((s) => s.setAllShipTypes);
  const [open, setOpen] = useState(false);

  const filterActive = activeShipTypes.length > 0;
  const allBuckets = SHIP_TYPE_BUCKETS.map((b) => b.id);

  return (
    <div className="map-layers">
      <button
        className={`layers-toggle ${filterActive ? 'active' : ''}`}
        title="Map layers & filters"
        onClick={() => setOpen((v) => !v)}
        aria-label="Map layers"
      >
        <LayersIcon /> Layers
      </button>
      {open && (
        <div className="layers-panel">
          <div className="layers-section">
            <div className="layers-section-title">Map style</div>
            <div className="filter-buttons">
              {MAP_STYLES.map((m) => (
                <button
                  key={m.id}
                  className={`filter-btn ${mapStyle === m.id ? 'active' : ''}`}
                  onClick={() => setMapStyle(m.id)}
                >{m.label}</button>
              ))}
            </div>
          </div>

          <div className="layers-section">
            <div className="layers-section-title">Overlays</div>
            <label className="layers-check">
              <input type="checkbox" checked={showWeather} onChange={(e) => setShowWeather(e.target.checked)} />
              <span>Weather</span>
            </label>
            <label className="layers-check">
              <input type="checkbox" checked={showDensity} onChange={(e) => setShowDensity(e.target.checked)} />
              <span>Traffic density</span>
            </label>
            <label className="layers-check">
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} />
              <span>Vessel names</span>
            </label>
          </div>

          <div className="layers-section">
            <div className="layers-section-title">
              Vessel types
              <button
                className="link-btn"
                onClick={() => setAllShipTypes(filterActive ? [] : allBuckets)}
              >{filterActive ? 'All' : 'Clear'}</button>
            </div>
            <div className="filter-buttons">
              {SHIP_TYPE_BUCKETS.map((b) => {
                const on = !filterActive || activeShipTypes.includes(b.id);
                return (
                  <button
                    key={b.id}
                    className={`filter-btn type-chip ${on ? 'active' : ''}`}
                    onClick={() => toggleShipType(b.id as ShipTypeBucket)}
                  >
                    <span className="type-dot" style={{ background: b.color }} />
                    {b.label}
                  </button>
                );
              })}
            </div>
            {filterActive && (
              <div className="small muted">Showing {activeShipTypes.length} of {SHIP_TYPE_BUCKETS.length} types</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
