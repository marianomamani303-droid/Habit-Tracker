import { useCallback, useEffect, useRef, useState } from "react";
import { CelebrationContext } from "../../context/CelebrationContext";

const particles = Array.from({ length: 18 }, (_, index) => {
  const angle = (index * Math.PI * 2) / 18;
  return {
    x: Math.round(Math.cos(angle) * 170),
    y: Math.round(Math.sin(angle) * 130),
    color: ["#7df4c6", "#c2acff", "#92b9ff", "#ffd28a"][index % 4],
  };
});

export default function CelebrationProvider({ children }) {
  const [celebration, setCelebration] = useState(null);
  const timer = useRef(null);
  const nextId = useRef(0);
  const celebrate = useCallback((detail) => {
    window.clearTimeout(timer.current);
    setCelebration({ ...detail, id: ++nextId.current });
    timer.current = window.setTimeout(() => setCelebration(null), 3200);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <CelebrationContext value={celebrate}>
      {children}
      {celebration && (
        <div
          className="celebration"
          key={celebration.id}
          role="status"
          aria-live="polite"
        >
          <div className="celebration-particles" aria-hidden="true">
            {particles.map((particle, index) => (
              <i
                key={index}
                style={{
                  "--particle-x": `${particle.x}px`,
                  "--particle-y": `${particle.y}px`,
                  "--particle-color": particle.color,
                }}
              />
            ))}
          </div>
          <div className="celebration-message">
            <strong>Objetivo alcanzado ✦</strong>
            <span>{celebration.name}</span>
            {celebration.streak && (
              <p>
                ¡Nueva racha: {celebration.streak} {celebration.unit}!
              </p>
            )}
          </div>
        </div>
      )}
    </CelebrationContext>
  );
}
