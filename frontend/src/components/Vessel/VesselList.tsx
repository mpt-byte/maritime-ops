import { useState } from 'react';
import type { VesselPosition } from '../../types/index';
import { fmtSpeed, statusColor } from '../../utils/format';
import { statusFromSog } from '../../utils/geo';
import { shipTypeBucket, SHIP_TYPE_BUCKETS, type ShipTypeBucket } from '../../stores/fleetStore';

type SortKey = 'speed' | 'name' | 'mmsi';
type StatusFilter = 'all' | 'underway' | 'stopped' | 'in_port';

interface Props {
  positions: Map<number, VesselPosition>;
  selectedMmsi: number | null;
  onSelect: (m: number, pos: VesselPosition) => void;
}

export function VesselList({ positions, selectedMmsi, onSelect }: Props) {
  const [sort, setSort] = useState<SortKey>('speed');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<ShipTypeBucket | 'all'>('all');
  const [query, setQuery] = useState('');

  const list = Array.from(positions.values())
    .filter((p) => {
      if (statusFilter !== 'all' && statusFromSog(p.sog) !== statusFilter) return false;
      if (typeFilter !== 'all' && shipTypeBucket(p.ship_type) !== typeFilter) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const name = (p.name ?? '').toLowerCase();
        if (!name.includes(q) && !String(p.mmsi).includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'speed') return (b.sog ?? 0) - (a.sog ?? 0);
      if (sort === 'name') return (a.name ?? `MMSI ${a.mmsi}`).localeCompare(b.name ?? `MMSI ${b.mmsi}`);
      return a.mmsi - b.mmsi;
    });

  return (
    <div className="vessel-list-wrap">
      <input
        className="search"
        placeholder="Filter by name or MMSI…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="list-filters">
        <div className="filter-buttons">
          {(['all', 'underway', 'in_port', 'stopped'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              className={`filter-btn ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >{s === 'all' ? 'All' : s === 'in_port' ? 'Port' : s[0]!.toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className="list-filters">
        <select className="list-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ShipTypeBucket | 'all')}>
          <option value="all">All types</option>
          {SHIP_TYPE_BUCKETS.map((b) => (
            <option key={b.id} value={b.id}>{b.label}</option>
          ))}
        </select>
        <select className="list-select" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="speed">Sort: Speed</option>
          <option value="name">Sort: Name</option>
          <option value="mmsi">Sort: MMSI</option>
        </select>
      </div>
      <div className="vessel-list">
        {list.length === 0 && <div className="small muted">No vessels match the current filters.</div>}
        {list.map((p) => {
          const status = statusFromSog(p.sog);
          const bucket = shipTypeBucket(p.ship_type);
          const bucketDef = SHIP_TYPE_BUCKETS.find((b) => b.id === bucket);
          return (
            <div
              key={p.mmsi}
              className={`vessel-row ${selectedMmsi === p.mmsi ? 'selected' : ''}`}
              onClick={() => onSelect(p.mmsi, p)}
            >
              <span className="type-dot" style={{ background: bucketDef?.color ?? '#6b7280' }} />
              <div className="vessel-row-main">
                <span className="name">{p.name ?? `MMSI ${p.mmsi}`}</span>
                <span className="meta">{fmtSpeed(p.sog)} · {p.destination ?? '—'}</span>
              </div>
              <span className="tag" style={{ borderColor: statusColor(status), color: statusColor(status) }}>{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
