import type { VesselPosition } from '../../types/index';
import { fmtSpeed, statusColor } from '../../utils/format';
import { statusFromSog } from '../../utils/geo';

interface Props {
  positions: Map<number, VesselPosition>;
  selectedMmsi: number | null;
  onSelect: (m: number, pos: VesselPosition) => void;
}

export function VesselList({ positions, selectedMmsi, onSelect }: Props) {
  const list = Array.from(positions.values()).sort((a, b) => (b.sog ?? 0) - (a.sog ?? 0));
  return (
    <div className="vessel-list">
      {list.length === 0 && <div className="small muted">No live vessels. Connect an AIS source or run demo mode.</div>}
      {list.map((p) => {
        const status = statusFromSog(p.sog);
        return (
          <div
            key={p.mmsi}
            className={`vessel-row ${selectedMmsi === p.mmsi ? 'selected' : ''}`}
            onClick={() => onSelect(p.mmsi, p)}
          >
            <div className="col">
              <span className="name">MMSI {p.mmsi}</span>
              <span className="meta">{fmtSpeed(p.sog)} · {p.destination ?? '—'}</span>
            </div>
            <span className="tag" style={{ borderColor: statusColor(status), color: statusColor(status) }}>{status}</span>
          </div>
        );
      })}
    </div>
  );
}
