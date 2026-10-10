import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { experienceApi } from "../services/experienceApi";
import ResourceState from "../componentes/habits/ResourceState";
import EmptyState from "../componentes/dashboard/EmptyState";

export default function Recordatorios() {
  const { notifications } = useOutletContext();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function read(id) {
    setBusy(true);
    setError("");
    try {
      await experienceApi.read(id);
      notifications.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dashboard-card">
      <div className="dashboard-section-header">
        <div>
          <p className="dashboard-eyebrow">UN MOMENTO PARA VOS</p>
          <h2>Tus recordatorios</h2>
        </div>
        <div className="habit-actions">
          <button
            disabled={busy || !notifications.data?.pendientes}
            onClick={() => read()}
          >
            Marcar todos como leídos
          </button>
        </div>
      </div>
      <p className="habit-section-intro">
        Configurá un horario desde el detalle de cada hábito. Te avisamos al
        entrar y mientras usás Habitly.
      </p>
      <ResourceState {...notifications} onRetry={notifications.reload} />
      {error && (
        <p role="alert" className="dashboard-error">
          {error}
        </p>
      )}
      {notifications.data &&
        (notifications.data.notificaciones.length ? (
          <div className="habit-notifications">
            {notifications.data.notificaciones.map((item) => (
              <article
                className={`habit-notification ${item.leido ? "is-read" : ""}`}
                key={item.id}
              >
                <div>
                  <span className="habit-notification-dot" aria-hidden="true" />
                  <Link to={`/dashboard/habitos/${item.habito_id}`}>
                    {item.nombre}
                  </Link>
                  <p>
                    {item.fecha} · {item.hora} ·{" "}
                    {item.leido ? "Leído" : "Tenés un paso pendiente"}
                  </p>
                </div>
                {!item.leido && (
                  <div className="habit-actions">
                    <button disabled={busy} onClick={() => read(item.id)}>
                      Marcar leído
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="Todo está tranquilo por acá">
            Cuando llegue el horario de un hábito pendiente, su recordatorio
            aparecerá aquí.
          </EmptyState>
        ))}
    </section>
  );
}
