import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { experienceApi } from "../../services/experienceApi";
import { passwordError } from "../../utils/passwordValidation";

export default function PasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { checkSession } = useAuth();
  const navigate = useNavigate();
  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    const validation = passwordError(body.password, body.confirmar);
    if (validation) {
      setError(validation);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await experienceApi.password(body);
      await checkSession();
      navigate("/IniciarSesion", {
        replace: true,
        state: { mensaje: "Contraseña actualizada. Iniciá sesión nuevamente." },
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="habit-form" onSubmit={submit}>
      <label>
        Contraseña actual
        <input
          name="actual"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      <label>
        Nueva contraseña
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <label>
        Confirmar nueva contraseña
        <input
          name="confirmar"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <p className="habit-muted">
        Al guardar, se cerrarán todas tus sesiones para proteger tu cuenta.
      </p>
      <button disabled={busy}>
        {busy ? "Actualizando…" : "Cambiar contraseña"}
      </button>
      {error && (
        <p className="dashboard-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
