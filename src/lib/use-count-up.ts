import { useEffect, useRef, useState } from "react";

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Counts from the last shown value. The first paint starts at 0. */
export function useCountUp(value: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      from.current = value;
      setCurrent(value);
      return;
    }

    const origin = from.current;
    const started = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      const next = origin + (value - origin) * easeOut(progress);
      setCurrent(next);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        from.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return current;
}
