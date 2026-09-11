import { useMemo } from 'react';
import type { VesselPosition } from '../../types/index';

interface Props {
  positions: VesselPosition[];
  index: number;
  onChange: (i: number) => void;
}

export function VoyageTimeline({ positions, index, onChange }: Props) {
  const stops = useMemo(() => {
    const out: Array<{ i: number; label: string }> = [];
    let stopStart = -1;
    for (let i = 1; i < positions.length; i++) {
      const sog = positions[i]?.sog ?? 0;
      if (sog < 0.5 && stopStart < 0) stopStart = i;
      else if (sog >= 0.5 && stopStart >= 0) {
        const dt = new Date(positions[i]?.timestamp ?? 0).getTime() - new Date(positions[stopStart]?.timestamp ?? 0).getTime();
        if (dt >= 2 * 3_600_000) out.push({ i: stopStart, label: '🛇 Stop' });
        stopStart = -1;
      }
    }
    return out;
  }, [positions]);

  if (positions.length === 0) return null;
  return (
    <div className="panel">
      <h3>Timeline</h3>
      <input
        type="range"
        min={0}
        max={positions.length - 1}
        value={index}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <div className="row between small muted">
        <span>{new Date(positions[0]?.timestamp ?? 0).toLocaleString()}</span>
        <span>{new Date(positions[positions.length - 1]?.timestamp ?? 0).toLocaleString()}</span>
      </div>
      {stops.length > 0 && (
        <div className="small" style={{ marginTop: 6 }}>
          <strong>{stops.length}</strong> detected port stops (&gt;2h)
        </div>
      )}
    </div>
  );
}
