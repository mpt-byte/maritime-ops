import { useEffect, useRef } from 'react';
import type { Map as MLMap } from 'maplibre-gl';
import type { WeatherPoint } from '../../types/index';

interface Props {
  map: MLMap;
  data: WeatherPoint[];
  visible: boolean;
}

// Lightweight animated wind particles drawn on a canvas overlay. Each particle
// drifts in the wind direction at a speed proportional to wind_speed. This is a
// simplified version of the Windy particle layer — no GRIB decoding; it uses the
// point samples from the weather service.
export function WindParticles({ map, data, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      age: Math.random() * 100,
    }));

    const sampleAt = (lon: number, lat: number): WeatherPoint | null => {
      let best: WeatherPoint | null = null;
      let bestD = Infinity;
      for (const p of data) {
        const d = (p.lon - lon) ** 2 + (p.lat - lat) ** 2;
        if (d < bestD) { bestD = d; best = p; }
      }
      return best;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const pt of particles) {
        const coord = map.unproject([pt.x, pt.y]);
        const sample = sampleAt(coord.lng, coord.lat);
        if (sample?.wind_dir != null && sample?.wind_speed != null) {
          const rad = (sample.wind_dir * Math.PI) / 180;
          const dx = Math.sin(rad) * sample.wind_speed * 0.5;
          const dy = -Math.cos(rad) * sample.wind_speed * 0.5;
          ctx.strokeStyle = `rgba(76,201,240,${Math.min(0.7, sample.wind_speed / 30)})`;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          ctx.lineTo(pt.x + dx, pt.y + dy);
          ctx.stroke();
          pt.x += dx;
          pt.y += dy;
        }
        pt.age++;
        if (pt.x < 0 || pt.x > canvas.width || pt.y < 0 || pt.y > canvas.height || pt.age > 100) {
          pt.x = Math.random() * canvas.width;
          pt.y = Math.random() * canvas.height;
          pt.age = 0;
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    if (visible) {
      rafRef.current = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [map, data, visible]);

  if (!visible) return null;
  return (
    <canvas
      ref={canvasRef}
      className="maplibregl-ctrl"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4 }}
    />
  );
}
