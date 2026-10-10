import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandMark from "./visual/BrandMark";
import "../css/Navbar.css";
import { useAuth } from "../hooks/useAuth";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useAuth();

  return (
    <nav className="navegacion fila">
      <Link className="logo" to="/" aria-label="Ir al inicio de Habitly">
        <BrandMark className="logo-img" />
        <span className="logo-copy">
          <strong>Habitly</strong>
          <small>ENCONTRÁ TU ÓRBITA</small>
        </span>
      </Link>

      {status === "authenticated" ? (
        <Link className="boton" to="/dashboard">
          Mi Dashboard
        </Link>
      ) : (
        location.pathname.toLowerCase() !== "/micuenta" && (
          <div className="usuario">
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => {
                navigate("/Registro");
              }}
            >
              Registrarse
            </button>
            <button
              type="button"
              className="boton"
              onClick={() => navigate("/IniciarSesion")}
            >
              Iniciar sesión
            </button>
          </div>
        )
      )}
    </nav>
  );
}

export default Navbar;
