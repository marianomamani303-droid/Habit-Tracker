import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import BrandMark from "../visual/BrandMark";
import DashboardIcon from "./DashboardIcon";
import { avatarUrl } from "../../services/experienceApi";

const links = [
  { to: "/dashboard", label: "Inicio", icon: "home", end: true },
  { to: "/dashboard/habitos", label: "Mis hábitos", icon: "habits" },
  { to: "/dashboard/estadisticas", label: "Estadísticas", icon: "stats" },
  { to: "/dashboard/historial", label: "Historial", icon: "clock" },
  { to: "/dashboard/logros", label: "Logros", icon: "medal" },
  { to: "/dashboard/recordatorios", label: "Recordatorios", icon: "bell" },
  { to: "/dashboard/configuracion", label: "Configuración", icon: "settings" },
];

export default function Sidebar({
  usuario,
  onLogout,
  cerrando,
  pendientes = 0,
}) {
  const [openPath, setOpenPath] = useState(null);
  const { pathname } = useLocation();
  const open = openPath === pathname;
  const menuButton = useRef(null);
  useEffect(() => {
    if (!open) return;
    const escape = (event) => {
      if (event.key === "Escape") {
        setOpenPath(null);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-brand-row">
        <Link
          className="dashboard-brand"
          to="/dashboard"
          aria-label="Habitly, ir a tu inicio"
        >
          <BrandMark />
          <span>
            Habitly
            <span className="dashboard-brand-caption">TU ÓRBITA DIARIA</span>
          </span>
        </Link>
        <button
          ref={menuButton}
          className="dashboard-menu-toggle"
          type="button"
          onClick={() => setOpenPath(open ? null : pathname)}
          aria-expanded={open}
          aria-controls="dashboard-navigation"
          aria-label={open ? "Cerrar navegación" : "Abrir navegación"}
        >
          <DashboardIcon name={open ? "close" : "menu"} />
        </button>
      </div>
      <div
        className={`dashboard-sidebar-content ${open ? "is-open" : ""}`}
        id="dashboard-navigation"
      >
        <p className="dashboard-nav-caption">MI ESPACIO</p>
        <nav aria-label="Navegación del Dashboard">
          {links.map(({ to, label, icon, end }) => (
            <NavLink
              to={to}
              end={end}
              key={to}
              onClick={() => setOpenPath(null)}
              className={({ isActive }) =>
                `dashboard-nav-link ${isActive ? "is-active" : ""}`
              }
            >
              <DashboardIcon name={icon} />
              <span>{label}</span>
              {icon === "bell" && pendientes > 0 && (
                <span className="habit-nav-count">{pendientes}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="dashboard-sidebar-note">
          <DashboardIcon name="stats" />
          <strong>
            Pequeños pasos.
            <br />
            Grandes cambios.
          </strong>
          <p>Hoy es un buen día para dedicarte un momento.</p>
        </div>
        <div className="dashboard-profile">
          <span className="dashboard-avatar" aria-hidden="true">
            {usuario.tiene_avatar ? (
              <img src={avatarUrl()} alt="" />
            ) : (
              usuario.nombre.slice(0, 1).toUpperCase()
            )}
          </span>
          <div>
            <strong>
              {usuario.nombre} {usuario.apellido}
            </strong>
            <span>Tu cuenta personal</span>
          </div>
        </div>
        <button
          className="dashboard-logout"
          type="button"
          onClick={onLogout}
          disabled={cerrando}
        >
          <DashboardIcon name="logout" />
          {cerrando ? "Cerrando sesión…" : "Cerrar sesión"}
        </button>
      </div>
    </aside>
  );
}
