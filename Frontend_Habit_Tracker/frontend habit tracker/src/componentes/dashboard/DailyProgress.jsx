import AnimatedNumber from "../visual/AnimatedNumber";
import { useAnimatedValue } from "../../hooks/useAnimatedValue";

export default function DailyProgress({ estadisticas }) {
  const totalHoy = estadisticas
    ? estadisticas.completadosHoy + estadisticas.pendientesHoy
    : null;
  const hasProgress = totalHoy > 0;
  const percentage = hasProgress ? estadisticas.cumplimiento : null;
  const animated = useAnimatedValue(percentage);
  return (
    <section
      className="dashboard-card dashboard-progress"
      aria-labelledby="progress-title"
    >
      <p className="dashboard-eyebrow">PULSO DIARIO</p>
      <h2 id="progress-title">Tu progreso de hoy</h2>
      <div className="dashboard-progress-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="progress-orbit" cx="60" cy="60" r="57" />
          <circle className="progress-track" cx="60" cy="60" r="48" />
          <circle
            className="progress-fill"
            cx="60"
            cy="60"
            r="48"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - (animated ?? 0)}
          />
        </svg>
        <div>
          <strong>
            <AnimatedNumber value={percentage} suffix="%" />
          </strong>
          <span>
            {hasProgress
              ? "completado"
              : estadisticas
                ? "Sin actividad"
                : "Sin datos"}
          </span>
        </div>
      </div>
      {hasProgress ? (
        <>
          <progress
            value={estadisticas.completadosHoy}
            max={totalHoy}
            aria-label={`${estadisticas.completadosHoy} de ${totalHoy} hábitos completados`}
          />
          <p>
            <strong>
              {estadisticas.completadosHoy} de {totalHoy}
            </strong>{" "}
            hábitos completados
          </p>
        </>
      ) : (
        <p>
          {estadisticas
            ? "No hay hábitos programados para hoy."
            : "Tu progreso aparecerá cuando el seguimiento esté disponible."}
        </p>
      )}
      <div className="dashboard-progress-note">
        {percentage === 100 ? (
          <>
            Órbita completa.
            <br />
            Hoy cumpliste todos tus hábitos.
          </>
        ) : percentage > 0 ? (
          <>
            Ya estás en movimiento.
            <br />
            Cada avance construye constancia.
          </>
        ) : (
          <>
            Cada pequeño paso cuenta.
            <br />
            Avanzá a tu ritmo.
          </>
        )}
      </div>
    </section>
  );
}
