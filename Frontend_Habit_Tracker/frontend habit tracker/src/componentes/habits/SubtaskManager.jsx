import { useState } from "react";
import { habitsApi } from "../../services/habitsApi";

function TaskEditor({ task, busy, onEdit, onDelete }) {
  return (
    <form
      className="habit-task-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onEdit(task.id, new FormData(event.currentTarget).get("nombre"));
      }}
    >
      <label>
        Nombre de subtarea
        <input
          aria-label={`Nombre de ${task.nombre}`}
          name="nombre"
          required
          maxLength={120}
          defaultValue={task.nombre}
        />
      </label>
      <button disabled={busy}>Guardar nombre</button>
      <button
        type="button"
        className="habit-button-soft"
        disabled={busy}
        onClick={() => onDelete(task.id)}
      >
        Eliminar subtarea
      </button>
      <small>
        Desde {task.desde}
        {task.hasta ? ` · Finaliza ${task.hasta}` : ""}
      </small>
    </form>
  );
}

export default function SubtaskManager({ habit, onChange }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function run(operation) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const result = await operation();
      setMessage(
        result.desde
          ? `Subtarea creada. Disponible desde ${result.desde}.`
          : result.hasta
            ? `Subtarea finalizada desde ${result.hasta}. Su historial se conserva.`
            : "Nombre actualizado.",
      );
      onChange();
      return true;
    } catch (error) {
      setError(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="habit-settings-section">
      <h3>Los pequeños pasos</h3>
      <p>
        Completá todas las subtareas del día para cumplir el hábito. La barra
        refleja los pasos completados; podés marcar todos juntos. Las altas y
        bajas respetan el historial.
      </p>
      {(habit.subtareas ?? [])
        .filter((task) => !task.hasta || task.hasta > habit.hoy.fecha)
        .map((task) => (
          <TaskEditor
            key={task.id}
            task={task}
            busy={busy}
            onEdit={(id, nombre) =>
              run(() => habitsApi.editSubtask(habit.id, id, nombre))
            }
            onDelete={(id) => run(() => habitsApi.removeSubtask(habit.id, id))}
          />
        ))}
      <form
        className="habit-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const nombre = new FormData(form).get("nombre");
          if (await run(() => habitsApi.addSubtask(habit.id, nombre)))
            form.reset();
        }}
      >
        <label>
          Nueva subtarea
          <input
            name="nombre"
            required
            maxLength={120}
            placeholder="Por ejemplo: preparar la botella"
          />
        </label>
        <button disabled={busy}>
          {busy ? "Guardando…" : "Agregar subtarea"}
        </button>
      </form>
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
