import { Link, useOutletContext } from "react-router-dom";
import { useState } from "react";
import { useHabitsResource } from "../hooks/useHabitsResource";
import { habitsApi } from "../services/habitsApi";
import { useAuth } from "../hooks/useAuth";
import ResourceState from "../componentes/habits/ResourceState";

export default function MisHabitos() {
  const [filter, setFilter] = useState("todos");
  const resource = useHabitsResource("list", filter);
  const { habits } = useOutletContext();
  const { checkSession } = useAuth();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function toggleArchive(habit) {
    setBusyId(habit.id);
    setError("");
    try {
      const archived =
        habit.proximaConfiguracion?.archivado ?? habit.configuracion?.archivado;
      await habitsApi.archive(habit.id, !archived);
      resource.reload();
      habits.retry();
    } catch (error) {
      if (error.status === 401) checkSession();
      setError(error.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="dashboard-card">
      <div className="dashboard-section-header">
        <h2>Tu colección de hábitos</h2>
        <Link className="boton" to="/dashboard/habitos/nuevo">
          Crear hábito
        </Link>
      </div>
      <label className="habit-list-filter">
        Mostrar{" "}
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          {["todos", "activos", "archivados", "completados"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <ResourceState
        loading={resource.loading}
        error={resource.error || error}
        onRetry={resource.reload}
      />
      {!resource.loading && (
        <div className="habit-list habit-collection">
          {resource.data?.habitos.map((habit) => (
            <HabitListItem
              key={habit.id}
              habit={habit}
              busy={busyId === habit.id}
              onArchive={() => toggleArchive(habit)}
            />
          ))}
          {resource.data && !resource.data.habitos.length && (
            <p>
              No hay hábitos para este filtro. Creá tu primer hábito para
              comenzar.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function HabitListItem({ habit, busy, onArchive }) {
  const archived =
    habit.proximaConfiguracion?.archivado ?? habit.configuracion?.archivado;
  return (
    <article
      className={`habit-card ${habit.hoy.completado ? "is-complete" : ""}`}
    >
      <div className="habit-card-heading">
        <Link to={`/dashboard/habitos/${habit.id}`}>
          <h3>{habit.nombre}</h3>
        </Link>
        <span className="habit-badge">
          {habit.configuracion?.archivado ? "Archivado" : "Activo"}
        </span>
      </div>
      <p>{habit.descripcion}</p>
      <p>
        {habit.configuracion?.frecuencia ?? "Inicio futuro"} · Racha{" "}
        {habit.rachaActual} · Mejor {habit.mejorRacha}
      </p>
      {habit.proximaConfiguracion && (
        <p>Cambio programado para {habit.proximaConfiguracion.desde}</p>
      )}
      <div className="habit-actions">
        <Link to={`/dashboard/habitos/${habit.id}/editar`}>Editar</Link>
        <button type="button" onClick={onArchive} disabled={busy}>
          {archived ? "Restaurar desde mañana" : "Archivar desde mañana"}
        </button>
      </div>
    </article>
  );
}
