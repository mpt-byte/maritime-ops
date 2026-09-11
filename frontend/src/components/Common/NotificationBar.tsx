import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import type { Alert } from '../../types/index';
import { severityColor, fmtDate } from '../../utils/format';

export function NotificationBar({ onSelectVessel }: { onSelectVessel: (mmsi: number) => void }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => api.alerts(20).then((r) => setAlerts(r.data)).catch(() => {});
    void load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const unack = alerts.filter((a) => !a.acknowledged_at);

  return (
    <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 6 }}>
      <button onClick={() => setOpen((o) => !o)} className={unack.length > 0 ? 'active' : ''}>
        🔔 {unack.length > 0 ? unack.length : ''}
      </button>
      {open && (
        <div className="panel" style={{ position: 'absolute', top: 40, left: 0, width: 320, maxHeight: 400, overflowY: 'auto' }}>
          <h3>Alerts ({alerts.length})</h3>
          {alerts.length === 0 && <div className="small muted">No alerts</div>}
          {alerts.map((a) => (
            <div
              key={a.id}
              className="vessel-row"
              onClick={() => { onSelectVessel(a.mmsi); setOpen(false); }}
            >
              <div className="col">
                <span className="name">{a.alert_type}</span>
                <span className="meta">{a.vessel_name ?? `MMSI ${a.mmsi}`} · {fmtDate(a.created_at)}</span>
              </div>
              <span className="tag" style={{ borderColor: severityColor(a.severity), color: severityColor(a.severity) }}>{a.severity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
