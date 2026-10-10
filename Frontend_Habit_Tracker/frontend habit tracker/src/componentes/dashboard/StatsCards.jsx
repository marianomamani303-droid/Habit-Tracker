import DashboardIcon from "./DashboardIcon";
import AnimatedNumber from "../visual/AnimatedNumber";

export default function StatsCards({ estadisticas }) {
  const cards = [
    {
      label: "Hábitos totales",
      value: estadisticas?.totales,
      icon: "habits",
      detail: "En tu rutina",
    },
    {
      label: "Completados hoy",
      value: estadisticas?.completadosHoy,
      icon: "check",
      detail: "Pasos que ya diste",
    },
    {
      label: "Pendientes hoy",
      value: estadisticas?.pendientesHoy,
      icon: "clock",
      detail: "A tu propio ritmo",
    },
    {
      label: "Cumplimiento",
      value: estadisticas?.cumplimiento,
      icon: "stats",
      detail: "De los hábitos de hoy",
      percent: true,
    },
  ];
  return (
    <div className="dashboard-stats">
      {cards.map(({ label, value, icon, detail, percent }) => (
        <article className="dashboard-card dashboard-stat" key={label}>
          <div className="dashboard-stat-top">
            <h2>{label}</h2>
            <span className={`dashboard-stat-icon dashboard-stat-icon-${icon}`}>
              <DashboardIcon name={icon} />
            </span>
          </div>
          <strong
            aria-label={value == null ? "Sin datos disponibles" : undefined}
          >
            <AnimatedNumber value={value} suffix={percent ? "%" : ""} />
          </strong>
          <p>{value == null ? "Sin datos disponibles" : detail}</p>
        </article>
      ))}
    </div>
  );
}
