import type { WeatherPoint } from '../../types/index';

export interface SeriesDef {
  key: keyof WeatherPoint;
  label: string;
  unit: string;
  color: string;
}

interface Props {
  data: WeatherPoint[];
  series: SeriesDef[];
  height?: number;
}

export function WeatherChart({ data, series, height = 140 }: Props) {
  if (data.length === 0 || series.length === 0) {
    return <div className="small muted">No data for this category.</div>;
  }

  const width = 520;
  const padL = 38;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xs = data.map((d) => new Date(d.timestamp).getTime());
  const xMin = xs[0] ?? 0;
  const xMax = xs[xs.length - 1] ?? 1;
  const xSpan = Math.max(1, xMax - xMin);
  const x = (v: number) => padL + ((v - xMin) / xSpan) * plotW;

  const yMin = Math.min(
    ...series.map((s) => {
      const vals = data.map((d) => d[s.key] as number | undefined).filter((v): v is number => v != null);
      return vals.length ? Math.min(...vals) : Infinity;
    }),
  );
  const yMax = Math.max(
    ...series.map((s) => {
      const vals = data.map((d) => d[s.key] as number | undefined).filter((v): v is number => v != null);
      return vals.length ? Math.max(...vals) : -Infinity;
    }),
  );
  const lo = Number.isFinite(yMin) ? yMin : 0;
  const hi = Number.isFinite(yMax) ? yMax : 1;
  const yPad = (hi - lo) * 0.1 || 1;
  const yLo = lo - yPad;
  const yHi = hi + yPad;
  const ySpan = Math.max(1e-6, yHi - yLo);
  const y = (v: number) => padT + plotH - ((v - yLo) / ySpan) * plotH;

  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => yLo + (ySpan * i) / ticks);

  const xTicks = Math.min(6, data.length);
  const xTickIdx = Array.from({ length: xTicks }, (_, i) => Math.round((i * (data.length - 1)) / (xTicks - 1)));

  return (
    <div className="weather-chart">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="xMidYMid meet" role="img">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padL} y1={y(t)} x2={width - padR} y2={y(t)} stroke="var(--border)" strokeWidth={0.5} />
            <text x={padL - 4} y={y(t)} textAnchor="end" dominantBaseline="middle" fontSize={9} fill="var(--text-dim)">
              {Math.round(t)}
            </text>
          </g>
        ))}
        {xTickIdx.map((idx, i) => {
          const d = data[idx];
          if (!d) return null;
          const ts = new Date(d.timestamp);
          return (
            <text key={i} x={x(ts.getTime())} y={height - 6} textAnchor="middle" fontSize={9} fill="var(--text-dim)">
              {ts.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </text>
          );
        })}
        {series.map((s) => {
          const pts = data
            .map((d, i) => {
              const v = d[s.key] as number | undefined;
              return v == null ? null : [x(xs[i]!), y(v)] as const;
            })
            .filter((p): p is readonly [number, number] => p != null);
          if (pts.length === 0) return null;
          const d = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
          return (
            <g key={s.key as string}>
              <polyline points={d} fill="none" stroke={s.color} strokeWidth={1.5} />
              <circle cx={pts[pts.length - 1]![0]} cy={pts[pts.length - 1]![1]} r={2.5} fill={s.color} />
            </g>
          );
        })}
      </svg>
      <div className="weather-chart-legend">
        {series.map((s) => (
          <span key={s.key as string} className="legend-item">
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.label} ({s.unit})
          </span>
        ))}
      </div>
    </div>
  );
}
