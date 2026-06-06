import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE } from '../config';

export type ServerStatus = 'online' | 'offline' | 'checking';

interface UseServerStatusOptions {
  pingInterval?: number; // ms between checks
  onComeOnline?: () => void;
  onGoOffline?: () => void;
}

export function useServerStatus(options: UseServerStatusOptions = {}) {
  const { pingInterval = 8000, onComeOnline, onGoOffline } = options;
  const [status, setStatus] = useState<ServerStatus>('checking');
  const prevStatus = useRef<ServerStatus>('checking');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const ping = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const next: ServerStatus = res.ok ? 'online' : 'offline';
      setStatus(next);

      if (next === 'online' && prevStatus.current === 'offline') {
        onComeOnline?.();
      } else if (next === 'offline' && prevStatus.current === 'online') {
        onGoOffline?.();
      }
      prevStatus.current = next;
    } catch {
      const next: ServerStatus = 'offline';
      if (prevStatus.current === 'online') {
        onGoOffline?.();
      }
      setStatus(next);
      prevStatus.current = next;
    }
  }, [onComeOnline, onGoOffline]);

  useEffect(() => {
    ping(); // immediate first ping
    timer.current = setInterval(ping, pingInterval);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [ping, pingInterval]);

  const isOnline = status === 'online';
  const isOffline = status === 'offline';
  const isChecking = status === 'checking';

  return { status, isOnline, isOffline, isChecking, ping };
}
