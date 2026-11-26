import { useEffect, useState } from "react";

/** Current time in ms, refreshed on an interval. Pass `null` to stop ticking. */
export function useNow(intervalMs: number | null = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (intervalMs === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  return now;
}
