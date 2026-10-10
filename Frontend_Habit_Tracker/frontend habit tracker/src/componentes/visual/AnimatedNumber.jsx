import { useAnimatedValue } from "../../hooks/useAnimatedValue";

export default function AnimatedNumber({ value, suffix = "" }) {
  const display = useAnimatedValue(value);
  return (
    <span
      className="animated-number"
      aria-label={value == null ? "Sin datos disponibles" : `${value}${suffix}`}
    >
      {value == null
        ? "—"
        : `${display === value ? value : Math.round(display ?? 0)}${suffix}`}
    </span>
  );
}
