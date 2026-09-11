import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import type { FleetVessel } from '../../types/index';
import { fmtSpeed, fmtDate, statusColor } from '../../utils/format';

export function FleetDashboard() {
  const [fleet, setFleet] = useState<FleetVessel[]>([]);
  const [stats, setStats] = useState<{ total: number; underway: number; stopped: number; in_port: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, s] = await Promise.all([api.fleet(), api.fleetStats()]);
      setFleet(f.data);
      setStats(s);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const exportCsv = () => {
    window.open(api.exportVesselsCsvUrl(), '_blank');
  };

  return (
    <div className="panel">
      <div className="row between">
        <h3>Fleet dashboard</h3>
        <button onClick={load}>Refresh</button>
      </div>
      {loading && <div className="loading">Loading…</div>}
      {error && <div className="error">{error}</div>}
      {stats && (
        <div className="fleet-grid" style={{ margin: '8px 0' }}>
          <div className="panel" style={{ margin: 0, padding: 10 }}><div className="muted small">Total</div><strong>{stats.total}</strong></div>
          <div className="panel" style={{ margin: 0, padding: 10 }}><div className="muted small">Underway</div><strong style={{ color: statusColor('underway') }}>{stats.underway}</strong></div>
          <div className="panel" style={{ margin: 0, padding: 10 }}><div className="muted small">In port</div><strong style={{ color: statusColor('in_port') }}>{stats.in_port}</strong></div>
          <div className="panel" style={{ margin: 0, padding: 10 }}><div className="muted small">Stopped</div><strong style={{ color: statusColor('stopped') }}>{stats.stopped}</strong></div>
        </div>
      )}
      {fleet.length > 0 && (
        <table className="table">
          <thead><tr><th>Name</th><th>MMSI</th><th>Group</th><th>Status</th><th>Speed</th><th>Updated</th></tr></thead>
          <tbody>
            {fleet.map((v) => (
              <tr key={v.mmsi}>
                <td>{v.name ?? '—'}</td>
                <td>{v.mmsi}</td>
                <td>{v.group_name ?? '—'}</td>
                <td><span className="tag" style={{ borderColor: statusColor(v.status), color: statusColor(v.status) }}>{v.status}</span></td>
                <td>{fmtSpeed(v.last_position?.sog)}</td>
                <td>{fmtDate(v.last_position?.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <button onClick={exportCsv}>Export CSV</button>
      </div>
    </div>
  );
}
