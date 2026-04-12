import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to `target` over `duration` ms using ease-out cubic.
 * Re-triggers whenever `target` changes.
 */
export function useCountUp(target, duration = 900) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const end = Number(target);
    if (target === null || target === undefined || isNaN(end)) return;

    const startTime = performance.now();

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setCurrent(end * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}
