import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import type { FleetGroup } from '../../types/index';

export function FleetGroupManager() {
  const [groups, setGroups] = useState<FleetGroup[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0b3d91');
  const [groupId, setGroupId] = useState('');
  const [mmsi, setMmsi] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try { setGroups((await api.fleetGroups()).data); } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    try { await api.createFleetGroup({ name: name.trim(), color }); setName(''); void load(); }
    catch (e) { setError((e as Error).message); }
  };

  const addVessel = async () => {
    const gid = Number(groupId);
    const m = Number(mmsi);
    if (!gid || !m) return;
    try { await api.addFleetVessel(gid, m); setMmsi(''); void load(); }
    catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="panel">
      <h3>Fleet groups</h3>
      {error && <div className="error small">{error}</div>}
      <div className="col">
        <input placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="row">
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 40, padding: 0 }} />
          <button className="primary" onClick={create}>Create group</button>
        </div>
      </div>
      {groups.length > 0 && (
        <table className="table" style={{ marginTop: 8 }}>
          <thead><tr><th>Name</th><th>Vessels</th><th>Color</th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.id}>
                <td>{g.name}</td>
                <td>{g.vessel_count ?? 0}</td>
                <td><span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 4, background: g.color }} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="col" style={{ marginTop: 8 }}>
        <h3 style={{ margin: 0 }}>Add vessel to group</h3>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">Group…</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input placeholder="MMSI" value={mmsi} onChange={(e) => setMmsi(e.target.value)} />
        <button onClick={addVessel}>Add</button>
      </div>
    </div>
  );
}
