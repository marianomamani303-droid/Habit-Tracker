import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../services/authApi";
import { passwordError } from "../utils/passwordValidation";
import "../css/auth.css";
import "../css/experience.css";

export default function Recuperar() {
  const navigate = useNavigate();
  const [token] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (window.location.hash) navigate("/recuperar", { replace: true });
  }, [navigate]);
  async function submit(event) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setMessage("");
    setError("");
    if (token) {
      const validation = passwordError(body.password, body.confirmar);
      if (validation) {
        setError(validation);
        return;
      }
    }
    setBusy(true);
    try {
      if (token) {
        await authApi.reset({ ...body, token });
        navigate("/IniciarSesion", {
          replace: true,
          state: {
            mensaje: "Contraseña actualizada. Iniciá sesión nuevamente.",
          },
        });
      } else {
        const result = await authApi.recover(body.email);
        setMessage(result.mensaje);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="contenedor habit-recovery">
      <form className="tarjeta auth-form" onSubmit={submit}>
        <p className="auth-eyebrow">VOLVÉ A TU ESPACIO</p>
        <h1 className="titulo">
          {token ? "Elegí una nueva contraseña" : "Recuperá tu acceso"}
        </h1>
        <p className="texto-suave">
          {token
            ? "El enlace se puede usar una sola vez y vence a los 30 minutos."
            : "Ingresá tu correo para solicitar un enlace de recuperación."}
        </p>
        {token ? (
          <>
            <div className="campo">
              <label htmlFor="reset-password">Nueva contraseña</label>
              <input
                className="entrada"
                id="reset-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="reset-confirm">Confirmar nueva contraseña</label>
              <input
                className="entrada"
                id="reset-confirm"
                name="confirmar"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </>
        ) : (
          <div className="campo">
            <label htmlFor="recovery-email">Email</label>
            <input
              className="entrada"
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
        )}
        <button className="boton" disabled={busy}>
          {busy
            ? "Procesando…"
            : token
              ? "Guardar contraseña"
              : "Solicitar enlace"}
        </button>
        {message && (
          <p role="status" className="auth-mensaje">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="auth-mensaje auth-error">
            {error}
          </p>
        )}
        <Link to="/IniciarSesion">Volver a iniciar sesión</Link>
      </form>
    </main>
  );
}
