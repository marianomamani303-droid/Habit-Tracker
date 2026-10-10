import { useEffect, useRef, useState } from "react";

export function useAnimatedValue(value, duration = 650) {
  const [display, setDisplay] = useState(value == null ? null : 0);
  const previous = useRef(0);
  useEffect(() => {
    if (value == null) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    const start = performance.now();
    const from = previous.current;
    const finish = () => {
      window.cancelAnimationFrame(frame);
      previous.current = value;
      setDisplay(value);
    };
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const next = from + (value - from) * (1 - Math.pow(1 - progress, 3));
      previous.current = next;
      setDisplay(next);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    if (media.matches || value === from) finish();
    else frame = window.requestAnimationFrame(tick);
    const change = () => {
      if (media.matches) finish();
    };
    media.addEventListener("change", change);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", change);
    };
  }, [value, duration]);
  return value == null ? null : display;
}
