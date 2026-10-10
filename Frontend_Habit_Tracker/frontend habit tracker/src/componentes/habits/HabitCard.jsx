import { useState } from "react";
import { Link } from "react-router-dom";
import { habitsApi } from "../../services/habitsApi";
import { useAuth } from "../../hooks/useAuth";
import { useCelebration } from "../../hooks/useCelebration";
import DashboardIcon from "../dashboard/DashboardIcon";
export default function HabitCard({ habit, date, onChange, actions = true }) {
  const { checkSession } = useAuth();
  const celebrate = useCelebration();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [taskOverrides, setTaskOverrides] = useState({
    source: "",
    values: {},
  });
  const day = habit.hoy ?? habit;
  const taskSignature = `${date}:${JSON.stringify((day.subtareas ?? []).map((task) => [task.id, task.completado]))}`;
  const overrides =
    taskOverrides.source === taskSignature ? taskOverrides.values : {};
  const target = day.objetivo;
  const current = day.cantidad;
  const currentPeriod = habit.periodoSemanal ?? habit.periodos?.at(-1);
  function celebrateConfirmed(response) {
    const confirmed = response?.habito;
    if (
      !day.completado &&
      confirmed?.hoy?.fecha === date &&
      confirmed.hoy.completado
    ) {
      const streak = confirmed.rachaActual;
      celebrate?.({
        name: confirmed.nombre,
        streak:
          streak > (habit.rachaActual ?? 0) && streak >= 3 ? streak : null,
        unit: day.frecuencia === "semanal" ? "semanas" : "días programados",
      });
    }
  }
  async function save(event) {
    event.preventDefault();
    await recordQuantity(
      Number(new FormData(event.currentTarget).get("cantidad")),
    );
  }
  async function recordQuantity(quantity) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await habitsApi.progress(habit.id, date, quantity);
      celebrateConfirmed(response);
      setMessage(
        quantity >= target
          ? "¡Un paso más! Hábito completado."
          : "Progreso actualizado.",
      );
      onChange();
    } catch (error) {
      if (error.status === 401) checkSession();
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={`habit-card ${day.completado ? "is-complete" : ""}`}>
      <div className="habit-card-heading">
        <Link to={"/dashboard/habitos/" + habit.id}>
          <h3>{habit.nombre}</h3>
        </Link>
        <span className={"habit-badge " + (day.completado ? "complete" : "")}>
          {day.completado
            ? "Completado"
            : day.frecuencia === "semanal"
              ? "Día opcional · meta semanal"
              : "Pendiente"}
        </span>
      </div>
      {habit.descripcion && <p>{habit.descripcion}</p>}
      <div className="habit-card-metrics">
        <p>
          <strong>{current}</strong> / {target} {day.unidad}
        </p>
        {habit.rachaActual !== undefined && (
          <span
            className={`habit-streak ${habit.rachaActual > 0 ? "has-streak" : ""}`}
          >
            <DashboardIcon name="flame" width={16} height={16} />
            Racha: {habit.rachaActual}{" "}
            {day.frecuencia === "semanal" ? "semanas" : "días programados"}
          </span>
        )}
      </div>
      <progress
        value={day.progreso ?? Math.min(100, (current / (target || 1)) * 100)}
        max={100}
        aria-label={"Progreso de " + habit.nombre}
      />
      {!!day.subtareas?.length && (
        <div className="habit-task-list">
          {day.subtareas.map((task) => (
            <label className="habit-check-label" key={task.id}>
              <input
                type="checkbox"
                checked={overrides[task.id] ?? task.completado}
                disabled={busy || !actions}
                onChange={async (event) => {
                  const checked = event.target.checked;
                  setTaskOverrides({
                    source: taskSignature,
                    values: { ...overrides, [task.id]: checked },
                  });
                  setBusy(true);
                  setError("");
                  setMessage("");
                  try {
                    const response = await habitsApi.subtaskProgress(
                      habit.id,
                      task.id,
                      date,
                      checked,
                    );
                    celebrateConfirmed(response);
                    onChange();
                    setMessage("Paso actualizado.");
                  } catch (error) {
                    setTaskOverrides({
                      source: taskSignature,
                      values: overrides,
                    });
                    if (error.status === 401) checkSession();
                    setError(error.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <span>{task.nombre}</span>
            </label>
          ))}
          <small>
            {day.subtareasCompletadas} de {day.subtareas.length} pasos
          </small>
        </div>
      )}
      {day.frecuencia === "semanal" && currentPeriod && (
        <p>
          Semana {currentPeriod.fecha}: {currentPeriod.realizado} /{" "}
          {currentPeriod.objetivo} días cumplidos.{" "}
          {currentPeriod.completado
            ? "Meta semanal alcanzada."
            : currentPeriod.actual
              ? "El período actual sigue abierto."
              : "Meta no alcanzada en este período."}
        </p>
      )}
      {actions && !day.subtareas?.length && (
        <form onSubmit={save} className="habit-progress-form">
          {target === 1 && !day.unidad && (
            <button
              type="button"
              disabled={busy}
              onClick={() => recordQuantity(day.completado ? 0 : 1)}
            >
              {day.completado ? "Desmarcar" : "Marcar completado"}
            </button>
          )}
          <label>
            Cantidad{" "}
            <input
              aria-label={"Cantidad para " + habit.nombre}
              name="cantidad"
              type="number"
              min="0"
              max="1000000"
              step="0.001"
              defaultValue={current}
              key={date + ":" + current}
              required
            />
          </label>
          <button className="boton" disabled={busy}>
            {busy ? "Guardando…" : "Guardar progreso"}
          </button>
        </form>
      )}
      {actions && !!day.subtareas?.length && (
        <div className="habit-actions">
          <button
            disabled={busy}
            onClick={() => recordQuantity(day.completado ? 0 : target)}
          >
            {day.completado
              ? "Desmarcar todos los pasos"
              : "Completar todos los pasos"}
          </button>
        </div>
      )}
      {message && (
        <p className="habit-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="dashboard-error">
          {error}
        </p>
      )}
    </article>
  );
}
