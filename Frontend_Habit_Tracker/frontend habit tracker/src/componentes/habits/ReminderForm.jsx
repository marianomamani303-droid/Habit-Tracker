import { useState } from "react";
import { useHabitsResource } from "../../hooks/useHabitsResource";
import { habitsApi } from "../../services/habitsApi";
import { useAuth } from "../../hooks/useAuth";
import ResourceState from "./ResourceState";

export default function ReminderForm({ habitId, onChange }) {
  const resource = useHabitsResource("reminder", habitId);
  const { usuario } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await habitsApi.saveReminder(habitId, {
        hora: form.get("hora"),
        activo: form.has("activo"),
      });
      setMessage("Recordatorio guardado.");
      onChange();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="habit-settings-section">
      <h3>Un momento para tu hábito</h3>
      <p>
        Te avisamos dentro de Habitly, los días programados, en{" "}
        {usuario.zona_horaria}.
      </p>
      <ResourceState {...resource} onRetry={resource.reload} />
      {resource.data && (
        <form className="habit-form" onSubmit={save}>
          <label>
            Horario del recordatorio
            <input
              type="time"
              name="hora"
              required
              defaultValue={resource.data.recordatorio?.hora ?? "09:00"}
            />
          </label>
          <label className="habit-check-label">
            <input
              type="checkbox"
              name="activo"
              defaultChecked={!!resource.data.recordatorio?.activo}
            />
            Activar recordatorio
          </label>
          <button disabled={busy}>
            {busy ? "Guardando…" : "Guardar recordatorio"}
          </button>
        </form>
      )}
      {message && (
        <p className="habit-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
