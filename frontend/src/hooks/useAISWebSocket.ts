import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from '../utils/api';
import type { VesselPosition } from '../types/index';

export interface AISWebSocketState {
  positions: Map<number, VesselPosition>;
  connected: boolean;
  error: string | null;
  subscribe: (bbox?: number[], mmsi?: number[]) => void;
}

export function useAISWebSocket(): AISWebSocketState {
  const [positions, setPositions] = useState<Map<number, VesselPosition>>(new Map());
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const subRef = useRef<{ bbox?: number[]; mmsi?: number[] }>({});

  const sendSubscribe = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== ws.OPEN) return;
    ws.send(JSON.stringify({ type: 'subscribe', payload: subRef.current }));
  }, []);

  const connect = useCallback(() => {
    const url = `${api.wsBase}/positions`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    wsRef.current = ws;
    ws.onopen = () => {
      setConnected(true);
      setError(null);
      sendSubscribe();
    };
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 3000);
    };
    ws.onerror = () => setError('WebSocket error');
    ws.onmessage = (ev) => {
      let msg: { type: string; data?: VesselPosition | VesselPosition[] };
      try {
        msg = JSON.parse(ev.data as string);
      } catch {
        return;
      }
      if (msg.type === 'snapshot' && Array.isArray(msg.data)) {
        setPositions(new Map((msg.data as VesselPosition[]).map((p) => [p.mmsi, p])));
      } else if (msg.type === 'position' && msg.data && !Array.isArray(msg.data)) {
        const p = msg.data as VesselPosition;
        setPositions((prev) => {
          const next = new Map(prev);
          next.set(p.mmsi, p);
          return next;
        });
      }
    };
  }, [sendSubscribe]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const subscribe = useCallback((bbox?: number[], mmsi?: number[]) => {
    subRef.current = { bbox, mmsi };
    sendSubscribe();
  }, [sendSubscribe]);

  return { positions, connected, error, subscribe };
}
