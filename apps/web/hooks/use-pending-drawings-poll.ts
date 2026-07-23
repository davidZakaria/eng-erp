'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Drawing } from '@/lib/types';
import { clientApi } from '@/lib/client-api';

const DEFAULT_INTERVAL_MS = 12_000;

export function usePendingDrawingsPoll(options?: {
  enabled?: boolean;
  intervalMs?: number;
}) {
  const enabled = options?.enabled ?? true;
  const intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;

  const [pendingCount, setPendingCount] = useState(0);
  const [newUploads, setNewUploads] = useState<Drawing[]>([]);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  const poll = useCallback(async () => {
    const data = await clientApi<Drawing[]>('/drawings?pending=true');

    if (readyRef.current) {
      const fresh = data.filter((d) => !knownIdsRef.current.has(d.id));
      if (fresh.length > 0) {
        setNewUploads((prev) => {
          const merged = [...fresh, ...prev];
          const seen = new Set<string>();
          return merged.filter((d) => {
            if (seen.has(d.id)) return false;
            seen.add(d.id);
            return true;
          }).slice(0, 5);
        });
      }
    } else {
      readyRef.current = true;
    }

    knownIdsRef.current = new Set(data.map((d) => d.id));
    setPendingCount(data.length);
    return data;
  }, []);

  const dismissNewUploads = useCallback(() => {
    setNewUploads([]);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    poll().catch(() => {});

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        poll().catch(() => {});
      }
    }, intervalMs);

    function onVisible() {
      if (document.visibilityState === 'visible') {
        poll().catch(() => {});
      }
    }

    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, intervalMs, poll]);

  return {
    pendingCount,
    newUploads,
    dismissNewUploads,
    refreshPending: poll,
  };
}
