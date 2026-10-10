import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useState } from "react";
import { useHabitsResource } from "../hooks/useHabitsResource";
import { useAuth } from "../hooks/useAuth";
import { habitsApi } from "../services/habitsApi";
import HabitForm from "../componentes/habits/HabitForm";
import ResourceState from "../componentes/habits/ResourceState";

export default function HabitEditor() {
  const { id } = useParams();
  return id ? <ExistingHabitEditor id={id} /> : <EditorForm />;
}

function ExistingHabitEditor({ id }) {
  const resource = useHabitsResource("detail", id);
  if (resource.loading || resource.error)
    return <ResourceState {...resource} onRetry={resource.reload} />;
  return <EditorForm initial={resource.data.habito} />;
}

function EditorForm({ initial }) {
  const navigate = useNavigate();
  const { habits } = useOutletContext();
  const { checkSession } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(data) {
    setBusy(true);
    setError("");
    try {
      const response = initial
        ? await habitsApi.update(initial.id, data)
        : await habitsApi.create(data);
      habits.retry();
      navigate(`/dashboard/habitos/${response.habito.id}`);
    } catch (error) {
      if (error.status === 401) checkSession();
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-card habit-editor">
      <p className="dashboard-eyebrow">DISEÑÁ TU SIGUIENTE PASO</p>
      <h2>{initial ? "Editar hábito" : "Crear hábito"}</h2>
      <p className="habit-section-intro">
        Una intención concreta. Una frecuencia posible. Un objetivo a tu medida.
      </p>
      <div className="habit-editor-guide" aria-label="Elementos de tu hábito">
        <span>
          <b>01</b> Intención
        </span>
        <span>
          <b>02</b> Frecuencia
        </span>
        <span>
          <b>03</b> Objetivo
        </span>
      </div>
      <ResourceState error={error} />
      <HabitForm initial={initial} onSave={save} busy={busy} />
    </section>
  );
}
