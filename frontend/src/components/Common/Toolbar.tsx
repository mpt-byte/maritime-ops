import { useEffect, useState } from 'react';
import { useAppStore } from '../../stores/fleetStore';
import type { ViewMode } from '../../stores/fleetStore';
import { api, inferWsFromApi, currentApiBase, currentWsBase } from '../../utils/api';

const TABS: Array<{ id: ViewMode; label: string }> = [
  { id: 'live', label: 'Live' },
  { id: 'voyage', label: 'Voyage' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'weather', label: 'Weather' },
];

export function Toolbar() {
  const viewMode = useAppStore((s) => s.viewMode);
  const setViewMode = useAppStore((s) => s.setViewMode);
  const showWeather = useAppStore((s) => s.showWeather);
  const setShowWeather = useAppStore((s) => s.setShowWeather);
  const showDensity = useAppStore((s) => s.showDensity);
  const setShowDensity = useAppStore((s) => s.setShowDensity);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [override, setOverride] = useState(api.isOverride());
  const [status, setStatus] = useState<'idle' | 'ok' | 'down'>('idle');

  useEffect(() => {
    setDraft(currentApiBase());
    setOverride(api.isOverride());
  }, []);

  const checkHealth = async (base: string) => {
    if (!base) { setStatus('idle'); return; }
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/health`);
      setStatus(res.ok ? 'ok' : 'down');
    } catch {
      setStatus('down');
    }
  };

  const apply = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const ws = inferWsFromApi(trimmed);
    api.configure({ apiBase: trimmed, wsBase: ws });
    setOverride(true);
    await checkHealth(trimmed);
    window.location.reload();
  };

  const reset = () => {
    api.reset();
    setOverride(false);
    setStatus('idle');
    setDraft(currentApiBase());
    window.location.reload();
  };

  const dot = status === 'ok' ? 'ok' : status === 'down' ? 'down' : override ? 'warn' : 'idle';

  return (
    <div className="toolbar">
      {TABS.map((t) => (
        <button key={t.id} className={viewMode === t.id ? 'active' : ''} onClick={() => setViewMode(t.id)}>{t.label}</button>
      ))}
      <button className={showWeather ? 'active' : ''} onClick={() => setShowWeather(!showWeather)}>Weather</button>
      <button className={showDensity ? 'active' : ''} onClick={() => setShowDensity(!showDensity)}>Density</button>
      <button
        className={`conn ${dot}`}
        title={`API: ${currentApiBase()}\nWS: ${currentWsBase()}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="dot" /> {override ? 'Custom API' : 'Default API'}
      </button>
      {open && (
        <div className="conn-panel">
          <label className="small">Backend API base URL</label>
          <input
            value={draft}
            placeholder="https://your-backend.example.com/api/v1"
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="small muted">WebSocket: {override ? currentWsBase() : inferWsFromApi(draft || currentApiBase())}</div>
          <div className="row gap">
            <button className="primary" onClick={() => void apply()}>Apply &amp; reload</button>
            {override && <button onClick={reset}>Reset</button>}
          </div>
          <div className="small muted">Paste a running backend&apos;s API base (e.g. .../api/v1) to search ships by IMO live.</div>
        </div>
      )}
    </div>
  );
}
