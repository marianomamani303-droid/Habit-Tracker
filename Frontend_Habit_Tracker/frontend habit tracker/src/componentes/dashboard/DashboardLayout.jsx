import { useEffect, useState } from "react";
import { Outlet, useLocation, Link, NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useDashboardHabits } from "../../hooks/useDashboardHabits";
import Sidebar from "./Sidebar";
import "../../css/dashboard.css";
import "../../css/habits.css";
import { habitToday, HABIT_TIME_ZONE } from "../../utils/habitCalendar";
import { useNotifications } from "../../hooks/useNotifications";
import { experienceApi } from "../../services/experienceApi";
import DashboardIcon from "./DashboardIcon";
import CelebrationProvider from "../visual/CelebrationProvider";
import "../../css/experience.css";

const titles = {
  "/dashboard/habitos": "Mis hábitos",
  "/dashboard/estadisticas": "Estadísticas",
  "/dashboard/configuracion": "Configuración",
  "/dashboard/historial": "Historial",
  "/dashboard/logros": "Logros",
  "/dashboard/recordatorios": "Recordatorios",
};

export default function DashboardLayout() {
  const { usuario, logout } = useAuth();
  const habits = useDashboardHabits();
  const notifications = useNotifications();
  const { pathname } = useLocation();
  const pageTitle =
    titles[pathname] ??
    (pathname === "/dashboard/habitos/nuevo"
      ? "Nuevo hábito"
      : pathname.endsWith("/editar")
        ? "Editar hábito"
        : /^\/dashboard\/habitos\/\d+$/.test(pathname)
          ? "Tu hábito"
          : null);
  const [cerrando, setCerrando] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(() => new Date());
  useEffect(() => {
    const interval = window.setInterval(() => {
      setDate(new Date());
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  async function cerrarSesion() {
    if (cerrando) return;
    setCerrando(true);
    setError("");
    try {
      await logout();
    } catch (error) {
      setError(error.message);
    } finally {
      setCerrando(false);
    }
  }

  const dateString = habitToday(usuario.zona_horaria);
  const newMedals = (habits.logros ?? []).filter((medal) => medal.nuevo);
  return (
    <CelebrationProvider>
      <div className="dashboard-shell">
        <a className="dashboard-skip" href="#dashboard-main">
          Saltar al contenido
        </a>
        <Sidebar
          usuario={usuario}
          onLogout={cerrarSesion}
          cerrando={cerrando}
          pendientes={notifications.data?.pendientes}
        />
        <main className="dashboard-main" id="dashboard-main" tabIndex="-1">
          <header className="dashboard-header">
            <div>
              <p className="dashboard-eyebrow">TU DÍA EN HABITLY</p>
              <h1>
                {pageTitle ?? `Hola, ${usuario.nombre}`}
                {!pageTitle && (
                  <span className="dashboard-greeting-dot" aria-hidden="true">
                    .
                  </span>
                )}
              </h1>
              <p>
                {pageTitle
                  ? "Un espacio para cuidar tu rutina y reconocer tus avances."
                  : "Un nuevo día para construir la rutina que te hace bien."}
              </p>
            </div>
            <div className="habit-header-tools">
              <Link
                className="habit-bell"
                to="/dashboard/recordatorios"
                aria-label={`Recordatorios, ${notifications.data?.pendientes ?? 0} pendientes`}
              >
                <DashboardIcon name="bell" />
                {notifications.data?.pendientes > 0 && (
                  <span>{notifications.data.pendientes}</span>
                )}
              </Link>
              <time className="dashboard-date" dateTime={dateString}>
                <span>HOY</span>
                {new Intl.DateTimeFormat("es-AR", {
                  timeZone: usuario.zona_horaria ?? HABIT_TIME_ZONE,
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                }).format(date)}
              </time>
            </div>
          </header>
          {error && (
            <div className="dashboard-error" role="alert">
              No se pudo cerrar la sesión: {error}
            </div>
          )}
          {newMedals.length > 0 && (
            <div className="habit-unlock" role="status">
              <DashboardIcon name="medal" />
              <div>
                <strong>¡Tu constancia tiene una nueva medalla!</strong>
                <p>{newMedals.map((m) => m.nombre).join(" · ")}</p>
              </div>
              <button
                onClick={async () => {
                  try {
                    await experienceApi.acknowledge();
                    habits.retry();
                  } catch (error) {
                    setError(error.message);
                  }
                }}
              >
                ¡A seguir creciendo!
              </button>
            </div>
          )}
          <div className="page-transition dashboard-page" key={pathname}>
            <Outlet context={{ usuario, habits, notifications }} />
          </div>
          <footer className="dashboard-footer">
            A tu ritmo, día a día.<span>Habitly · Tu espacio personal</span>
          </footer>
        </main>
        <nav className="habit-mobile-nav" aria-label="Accesos móviles">
          {[
            { to: "/dashboard", label: "Inicio", icon: "home", end: true },
            { to: "/dashboard/habitos", label: "Hábitos", icon: "habits" },
            { to: "/dashboard/logros", label: "Logros", icon: "medal" },
            {
              to: "/dashboard/configuracion",
              label: "Perfil",
              icon: "settings",
            },
          ].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <DashboardIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </CelebrationProvider>
  );
}
