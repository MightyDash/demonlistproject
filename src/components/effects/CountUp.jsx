import React, { useEffect, useRef, useState } from "react";

export function CountUp({ value, duration = 1100 }) {
  const target = Number(value || 0);
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(target);
      previousValue.current = target;
      return;
    }

    const startValue = previousValue.current;
    const startedAt = performance.now();
    let frameId;

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (target - startValue) * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValue.current = target;
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, target]);

  return new Intl.NumberFormat("nl-NL").format(displayValue);
}
