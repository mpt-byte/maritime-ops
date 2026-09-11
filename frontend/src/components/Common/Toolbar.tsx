import { useAppStore } from '../../stores/fleetStore';
import type { ViewMode } from '../../stores/fleetStore';

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

  return (
    <div className="toolbar">
      {TABS.map((t) => (
        <button key={t.id} className={viewMode === t.id ? 'active' : ''} onClick={() => setViewMode(t.id)}>{t.label}</button>
      ))}
      <button className={showWeather ? 'active' : ''} onClick={() => setShowWeather(!showWeather)}>Weather</button>
      <button className={showDensity ? 'active' : ''} onClick={() => setShowDensity(!showDensity)}>Density</button>
    </div>
  );
}
