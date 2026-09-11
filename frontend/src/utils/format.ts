export function fmtCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${ns}, ${Math.abs(lon).toFixed(4)}° ${ew}`;
}

export function fmtSpeed(sog?: number): string {
  if (sog == null) return '—';
  return `${sog.toFixed(1)} kn`;
}

export function fmtHeading(h?: number): string {
  if (h == null) return '—';
  return `${Math.round(h)}°`;
}

export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export function fmtDuration(hours?: number): string {
  if (hours == null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours % 24);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
}

export function fmtDistance(nm?: number): string {
  if (nm == null) return '—';
  return `${nm.toFixed(1)} nm`;
}

export function statusColor(status: string): string {
  switch (status) {
    case 'underway': return '#2a9d8f';
    case 'in_port': return '#e9c46a';
    case 'stopped': return '#e76f51';
    default: return '#9ca3af';
  }
}

export function severityColor(sev: string): string {
  switch (sev) {
    case 'critical': return '#e63946';
    case 'warning': return '#f4a261';
    default: return '#457b9d';
  }
}

export function shipTypeColor(shipType?: number): string {
  if (shipType == null) return '#6b7280';
  if (shipType >= 80) return '#e63946'; // tanker
  if (shipType >= 70 && shipType < 80) return '#457b9d'; // cargo
  if (shipType >= 60 && shipType < 70) return '#9d4edd'; // passenger
  if (shipType === 30) return '#2a9d8f'; // fishing
  return '#6b7280';
}
