import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../css/session.css";

export default function ProtectedRoute() {
  const { status, checkedPath, error, checkSession } = useAuth();
  const location = useLocation();

  if (checkedPath !== location.pathname || status === "loading") {
    return (
      <main className="session-screen" aria-busy="true">
        <div className="session-spinner" aria-hidden="true" />
        <p role="status">Comprobando tu sesión…</p>
      </main>
    );
  }
  if (status === "error") {
    return (
      <main className="session-screen">
        <h1>No pudimos verificar tu sesión</h1>
        <p role="alert">{error}</p>
        <button type="button" className="boton" onClick={checkSession}>
          Volver a intentar
        </button>
      </main>
    );
  }
  if (status !== "authenticated") {
    return (
      <Navigate
        to="/IniciarSesion"
        replace
        state={{
          from: location.pathname,
          mensaje:
            "Inicia sesión para acceder a tu espacio. Si tu sesión expiró, vuelve a ingresar.",
        }}
      />
    );
  }
  return <Outlet />;
}
