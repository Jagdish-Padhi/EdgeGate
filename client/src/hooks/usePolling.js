import { useEffect, useRef, useState } from 'react';

/** Calls `load` every `intervalMs` and exposes the latest result. */
export function usePolling(load, intervalMs) {
  const [data, setData] = useState(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function run() {
      try {
        const result = await loadRef.current();
        if (!cancelled) setData(result);
      } finally {
        if (!cancelled) timer = setTimeout(run, intervalMs);
      }
    }
    run();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs]);

  return data;
}
