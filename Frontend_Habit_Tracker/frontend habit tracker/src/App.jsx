import { Routes, Route, Navigate } from "react-router-dom";

import "./css/base.css";

import Navbar from "./componentes/navbar";

import Home from "./pages/Home";
import Registro from "./pages/registrarse";
import IniciarSesion from "./pages/iniciar-sesion";
import MiCuenta from "./pages/MiCuenta";
import ProtectedRoute from "./componentes/ProtectedRoute";
import DashboardLayout from "./componentes/dashboard/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import MisHabitos from "./pages/MisHabitos";
import Estadisticas from "./pages/Estadisticas";
import HabitEditor from "./pages/HabitEditor";
import HabitDetail from "./pages/HabitDetail";
import Historial from "./pages/Historial";
import Logros from "./pages/Logros";
import Recordatorios from "./pages/Recordatorios";
import Recuperar from "./pages/Recuperar";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <>
            <Navbar />
            <Home />
          </>
        }
      />

      <Route
        path="/Registro"
        element={
          <>
            <Navbar />
            <Registro />
          </>
        }
      />
      <Route
        path="/IniciarSesion"
        element={
          <>
            <Navbar />
            <IniciarSesion />
          </>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="habitos" element={<MisHabitos />} />
          <Route path="habitos/nuevo" element={<HabitEditor />} />
          <Route path="habitos/:id" element={<HabitDetail />} />
          <Route path="habitos/:id/editar" element={<HabitEditor />} />
          <Route path="historial" element={<Historial />} />
          <Route path="estadisticas" element={<Estadisticas />} />
          <Route path="configuracion" element={<MiCuenta />} />
          <Route path="logros" element={<Logros />} />
          <Route path="recordatorios" element={<Recordatorios />} />
        </Route>
        <Route
          path="/MiCuenta"
          element={<Navigate to="/dashboard/configuracion" replace />}
        />
      </Route>
      <Route
        path="/recuperar"
        element={
          <>
            <Navbar />
            <Recuperar />
          </>
        }
      />
    </Routes>
  );
}

export default App;
