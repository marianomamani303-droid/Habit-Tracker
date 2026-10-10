import { Link, useParams, useOutletContext } from "react-router-dom";
import { useHabitsResource } from "../hooks/useHabitsResource";
import HabitCard from "../componentes/habits/HabitCard";
import ResourceState from "../componentes/habits/ResourceState";
import SubtaskManager from "../componentes/habits/SubtaskManager";
import ReminderForm from "../componentes/habits/ReminderForm";

export default function HabitDetail() {
  const { id } = useParams();
  const resource = useHabitsResource("detail", id);
  const { habits, notifications } = useOutletContext();
  if (resource.loading || resource.error)
    return <ResourceState {...resource} onRetry={resource.reload} />;
  const habit = resource.data.habito;
  return (
    <section className="dashboard-card habit-detail">
      <div className="dashboard-section-header">
        <p className="dashboard-eyebrow">SEGUIMIENTO PERSONAL</p>
        <Link
          className="dashboard-text-link"
          to={`/dashboard/habitos/${id}/editar`}
        >
          Editar hábito <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <HabitCard
        habit={habit}
        date={habit.hoy.fecha}
        actions={habit.hoy.programado}
        onChange={() => {
          resource.reload();
          habits.retry();
        }}
      />
      <p>
        Mejor racha: {habit.mejorRacha} · Períodos cumplidos:{" "}
        {habit.periodosCompletados} · Cumplimiento:{" "}
        {habit.porcentaje == null ? "—" : `${habit.porcentaje}%`}
      </p>
      {habit.proximaConfiguracion && (
        <p>Hay cambios programados para {habit.proximaConfiguracion.desde}.</p>
      )}
      <h3>Progreso reciente</h3>
      <div className="habit-table-wrap">
        <table>
          <caption>Últimos 30 registros</caption>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {habit.registros
              .slice(-30)
              .reverse()
              .map((record) => (
                <tr key={record.fecha}>
                  <td>{record.fecha}</td>
                  <td>{record.cantidad}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!habit.registros.length && <p>Todavía no hay registros.</p>}
      <Link to="/dashboard/historial">Consultar y corregir historial</Link>
      <SubtaskManager
        habit={habit}
        onChange={() => {
          resource.reload();
          habits.retry();
        }}
      />
      <ReminderForm habitId={id} onChange={notifications.reload} />
    </section>
  );
}
