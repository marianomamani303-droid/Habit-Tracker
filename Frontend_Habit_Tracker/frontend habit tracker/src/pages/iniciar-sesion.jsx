import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../services/authApi";
import { useAuth } from "../hooks/useAuth";
import "../css/iniciarSesion.css";

function IniciarSesion() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, checkedPath } = useAuth();
  const from = location.state?.from;
  const destination =
    typeof from === "string" &&
    (from === "/MiCuenta" ||
      /^\/dashboard(?:\/(?:habitos(?:\/(?:nuevo|[1-9]\d*(?:\/editar)?))?|estadisticas|historial|configuracion|logros|recordatorios))?$/.test(
        from,
      ))
      ? from
      : "/dashboard";
  const [datos, setDatos] = useState({
    email: location.state?.email ?? "",
    password: "",
  });
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  function cambiar(event) {
    const { name, value } = event.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
    setMensaje("");
  }

  async function enviar(event) {
    event.preventDefault();
    if (enviando) return;

    setEnviando(true);
    setMensaje("");
    try {
      await authApi.login(datos);
      navigate(destination, { replace: true });
    } catch (error) {
      setMensaje(error.message);
    } finally {
      setEnviando(false);
    }
  }

  if (status === "authenticated" && checkedPath === location.pathname) {
    return <Navigate to={destination} replace />;
  }

  return (
    <main className="contenedor auth-layout">
      <aside className="auth-presentacion">
        <span className="auth-distintivo">
          Pequeños pasos. Grandes cambios.
        </span>
        <h2>
          Un nuevo día para <span>seguir creciendo.</span>
        </h2>
        <p>
          Vuelve a tu rutina, reconoce tus avances y encuentra un momento para
          lo que te hace bien.
        </p>
        <div className="auth-rutina">
          <strong>A tu ritmo, día a día</strong>
          <p>✓ Organiza tus hábitos</p>
          <p>✓ Celebra cada pequeño avance</p>
          <p>✓ Construye constancia</p>
        </div>
        <p className="auth-nota">Un día pendiente no borra todo tu progreso.</p>
      </aside>
      <form
        className="tarjeta auth-form form-iniciar-sesion"
        onSubmit={enviar}
        aria-labelledby="titulo-sesion"
        aria-busy={enviando}
      >
        <div className="header-form">
          <p className="auth-eyebrow">QUÉ BUENO VOLVER A VERTE</p>
          <h1 className="titulo" id="titulo-sesion">
            Inicia <span>sesión</span>
          </h1>
          <p className="texto texto-suave">
            Cada pequeño paso cuenta. Continúa el tuyo.
          </p>
        </div>
        <div className="campo">
          <label htmlFor="email-sesion">Email</label>
          <input
            className="entrada"
            type="email"
            id="email-sesion"
            name="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={datos.email}
            onChange={cambiar}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="password-sesion">Contraseña</label>
          <input
            className="entrada"
            type="password"
            id="password-sesion"
            name="password"
            autoComplete="current-password"
            placeholder="Tu contraseña"
            value={datos.password}
            onChange={cambiar}
            required
          />
        </div>
        {location.state?.mensaje && (
          <p className="auth-mensaje" role="status">
            {location.state.mensaje}
          </p>
        )}
        <button type="submit" className="boton auth-submit" disabled={enviando}>
          {enviando ? "Iniciando sesión…" : "Iniciar sesión"}
          <span aria-hidden="true">→</span>
        </button>
        <p className="auth-mensaje auth-error" role="alert">
          {mensaje}
        </p>
        <p className="auth-alternativa">
          <Link className="auth-enlace" to="/recuperar">
            Olvidé mi contraseña
          </Link>
        </p>
        <p className="auth-alternativa">
          ¿No tienes una cuenta?{" "}
          <button
            type="button"
            className="auth-enlace"
            onClick={() => navigate("/Registro")}
          >
            Regístrate
          </button>
        </p>
      </form>
    </main>
  );
}
export default IniciarSesion;
