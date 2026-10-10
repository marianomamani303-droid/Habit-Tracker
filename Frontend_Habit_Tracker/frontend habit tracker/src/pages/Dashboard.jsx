import { Link, useOutletContext } from "react-router-dom";
import StatsCards from "../componentes/dashboard/StatsCards";
import HabitsToday from "../componentes/dashboard/HabitsToday";
import DailyProgress from "../componentes/dashboard/DailyProgress";
import MedalGallery from "../componentes/dashboard/MedalGallery";
import OrbitVisual from "../componentes/visual/OrbitVisual";

export default function Dashboard() {
  const { habits, notifications } = useOutletContext();
  return (
    <>
      <div className="dashboard-focus-grid">
        <section className="habit-orbit">
          <div>
            <p className="dashboard-eyebrow">ENCONTRÁ TU ÓRBITA</p>
            <h2>
              Hoy cuenta.
              <br />
              <span>Tu siguiente paso, también.</span>
            </h2>
            <p>
              El progreso empieza con una intención. Dale espacio a la tuya.
            </p>
            <Link className="boton" to="/dashboard/habitos/nuevo">
              + Crear un hábito
            </Link>
          </div>
          <OrbitVisual compact />
        </section>
        <DailyProgress estadisticas={habits.estadisticas} />
      </div>
      <StatsCards estadisticas={habits.estadisticas} />
      <div className="dashboard-content-grid">
        <section className="dashboard-card" aria-labelledby="habits-title">
          <div className="dashboard-section-header">
            <div>
              <p className="dashboard-eyebrow">TU RUTINA</p>
              <h2 id="habits-title">Hábitos de hoy</h2>
              <p>Dedica un momento a lo que te hace bien.</p>
            </div>
            <Link className="dashboard-text-link" to="/dashboard/habitos">
              Mis hábitos <span aria-hidden="true">→</span>
            </Link>
          </div>
          <HabitsToday {...habits} />
        </section>
      </div>
      <div className="habit-insights-grid">
        <section className="dashboard-card">
          <div className="dashboard-section-header">
            <h2>Señales de constancia</h2>
            <Link to="/dashboard/logros" className="dashboard-text-link">
              Ver medallas →
            </Link>
          </div>
          <p className="habit-section-intro">
            Mejor racha: {habits.resumen?.mejorRacha ?? "—"} períodos ·{" "}
            {habits.resumen?.totalCompletados ?? "—"} hábitos completados
          </p>
          <MedalGallery compact logros={habits.logros} />
        </section>
        <section className="dashboard-card">
          <div className="dashboard-section-header">
            <h2>Lo que viene</h2>
            <Link to="/dashboard/recordatorios" className="dashboard-text-link">
              Recordatorios →
            </Link>
          </div>
          <ul className="habit-upcoming">
            {(habits.proximos ?? []).map((item) => (
              <li key={item.id + item.fecha}>
                <span>{item.fecha}</span>
                <Link to={`/dashboard/habitos/${item.id}`}>{item.nombre}</Link>
              </li>
            ))}
          </ul>
          {habits.status === "ready" && !habits.proximos?.length && (
            <p className="habit-section-intro">
              Tu próxima semana está abierta. Elegí algo que quieras cuidar.
            </p>
          )}
          <p className="habit-reminder-summary">
            {notifications.error
              ? "No pudimos consultar los recordatorios."
              : `${notifications.data?.pendientes ?? 0} recordatorios pendientes`}
          </p>
        </section>
      </div>
      <aside className="dashboard-encouragement">
        <span className="dashboard-encouragement-mark" aria-hidden="true">
          “
        </span>
        <div>
          <h2>La constancia empieza con algo pequeño.</h2>
          <p>
            No necesitas hacerlo perfecto. Dale espacio a lo que importa, un día
            a la vez.
          </p>
        </div>
      </aside>
    </>
  );
}
