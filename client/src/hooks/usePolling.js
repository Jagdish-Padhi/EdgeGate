import { useCallback, useEffect, useRef, useState } from 'react';

/** Calls `load` every `intervalMs` and exposes the latest result, plus a refresh trigger. */
export function usePolling(load, intervalMs) {
  const [data, setData] = useState(null);
  const loadRef = useRef(load);
  loadRef.current = load;
  const timerRef = useRef(null);

  const fetchNow = useCallback(async () => {
    try {
      const result = await loadRef.current();
      setData(result);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const result = await loadRef.current();
        if (!cancelled) setData(result);
      } finally {
        if (!cancelled) timerRef.current = setTimeout(run, intervalMs);
      }
    }
    run();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [intervalMs]);

  return [data, fetchNow];
}
