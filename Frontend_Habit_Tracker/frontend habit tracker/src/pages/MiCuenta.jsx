import { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { experienceApi } from "../services/experienceApi";
import AvatarPicker from "../componentes/profile/AvatarPicker";
import PasswordForm from "../componentes/profile/PasswordForm";
import MedalGallery from "../componentes/dashboard/MedalGallery";

export default function MiCuenta() {
  const { usuario, habits, notifications } = useOutletContext();
  const { updateUsuario } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await experienceApi.updateProfile(body);
      updateUsuario(data.usuario);
      setMessage("Tu perfil está actualizado.");
      habits.retry();
      notifications.reload();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="habit-profile-grid">
      <section className="dashboard-card">
        <p className="dashboard-eyebrow">ESTE ESPACIO ES TUYO</p>
        <h2>Información personal</h2>
        <AvatarPicker />
        <form className="habit-form" onSubmit={save}>
          <div className="habit-form-grid">
            <label>
              Nombre
              <input
                name="nombre"
                required
                maxLength={100}
                defaultValue={usuario.nombre}
              />
            </label>
            <label>
              Apellido
              <input
                name="apellido"
                required
                maxLength={100}
                defaultValue={usuario.apellido}
              />
            </label>
          </div>
          <p className="habit-profile-email">
            Email: <span>{usuario.email}</span>
          </p>
          <label>
            Sobre vos
            <textarea
              name="bio"
              maxLength={280}
              defaultValue={usuario.bio}
              placeholder="Qué te inspira a seguir creciendo…"
            />
          </label>
          <label>
            Zona horaria
            <input
              name="zona_horaria"
              list="habit-timezones"
              required
              maxLength={80}
              defaultValue={usuario.zona_horaria}
            />
          </label>
          <datalist id="habit-timezones">
            {[
              ...new Set([
                usuario.zona_horaria,
                Intl.DateTimeFormat().resolvedOptions().timeZone,
                "America/Argentina/Buenos_Aires",
                "America/Montevideo",
                "America/Santiago",
                "America/Mexico_City",
                "America/Bogota",
                "Europe/Madrid",
                "UTC",
              ]),
            ].map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <p className="habit-muted">
            La zona horaria determina tu día, tus estadísticas y los horarios de
            tus recordatorios.
          </p>
          <button disabled={busy}>
            {busy ? "Guardando…" : "Guardar perfil"}
          </button>
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
        </form>
      </section>
      <section className="dashboard-card">
        <p className="dashboard-eyebrow">CUIDÁ TU ACCESO</p>
        <h2>Seguridad de tu cuenta</h2>
        <PasswordForm />
      </section>
      <section className="dashboard-card habit-profile-achievements">
        <div className="dashboard-section-header">
          <div>
            <h2>Lo que ya cultivaste</h2>
            <p>
              {habits.resumen?.totalCompletados ?? "—"} hábitos completados ·
              Mejor racha: {habits.resumen?.mejorRacha ?? "—"} períodos
            </p>
          </div>
          <Link to="/dashboard/logros" className="dashboard-text-link">
            Todas las medallas →
          </Link>
        </div>
        <MedalGallery compact logros={habits.logros} />
      </section>
    </div>
  );
}
