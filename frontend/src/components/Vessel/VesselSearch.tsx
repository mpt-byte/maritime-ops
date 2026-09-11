import { useState } from 'react';
import { api } from '../../utils/api';
import type { Vessel } from '../../types/index';

interface Props {
  onSelect: (mmsi: number) => void;
}

export function VesselSearch({ onSelect }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (value: string) => {
    setQ(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const r = await api.vessels({ q: value.trim(), pageSize: 20 });
      setResults(r.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="col">
      <input
        className="search"
        placeholder="Search MMSI / IMO / name / callsign"
        value={q}
        onChange={(e) => void search(e.target.value)}
      />
      {loading && <div className="small muted">Searching…</div>}
      {results.length > 0 && (
        <div className="vessel-list">
          {results.map((v) => (
            <div
              key={v.mmsi}
              className="vessel-row"
              onClick={() => { onSelect(v.mmsi); setResults([]); setQ(''); }}
            >
              <span className="name">{v.name ?? `MMSI ${v.mmsi}`}</span>
              <span className="meta">{v.mmsi}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
