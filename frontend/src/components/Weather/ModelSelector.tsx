import { useAppStore } from '../../stores/fleetStore';

export function ModelSelector() {
  const model = useAppStore((s) => s.weatherModel);
  const setModel = useAppStore((s) => s.setWeatherModel);
  const models: Array<{ id: string; label: string }> = [
    { id: 'best_match', label: 'Best match' },
    { id: 'ecmwf', label: 'ECMWF' },
    { id: 'gfs', label: 'GFS' },
    { id: 'icon', label: 'ICON' },
    { id: 'gfs_wave', label: 'GFS Wave' },
    { id: 'icon_wave', label: 'ICON Wave' },
  ];
  return (
    <div className="col">
      <h3 style={{ margin: 0 }}>Weather model</h3>
      <select value={model} onChange={(e) => setModel(e.target.value)}>
        {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
    </div>
  );
}
