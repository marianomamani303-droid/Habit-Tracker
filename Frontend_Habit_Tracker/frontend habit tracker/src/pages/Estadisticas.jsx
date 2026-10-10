import { useOutletContext } from "react-router-dom";
import { useHabitsResource } from "../hooks/useHabitsResource";
import StatsCards from "../componentes/dashboard/StatsCards";
import AnimatedNumber from "../componentes/visual/AnimatedNumber";
import ResourceState from "../componentes/habits/ResourceState";
import TrendChart from "../componentes/habits/TrendChart";
import { useState } from "react";
import { habitToday } from "../utils/habitCalendar";

export default function Estadisticas() {
  const { habits, usuario } = useOutletContext();
  const [filters, setFilters] = useState({
    periodo: "mes",
    fecha: habitToday(usuario.zona_horaria),
  });
  const resource = useHabitsResource(
    "statistics",
    new URLSearchParams(filters).toString(),
  );
  return (
    <>
      <StatsCards estadisticas={habits.estadisticas} />
      <section className="dashboard-card">
        <p className="dashboard-eyebrow">TU TRAYECTORIA</p>
        <h2>Tu constancia, en perspectiva</h2>
        <form
          className="habit-filter-form"
          onSubmit={(event) => {
            event.preventDefault();
            setFilters(Object.fromEntries(new FormData(event.currentTarget)));
          }}
        >
          <label>
            Período
            <select
              aria-label="Período"
              name="periodo"
              defaultValue={filters.periodo}
            >
              <option value="semana">Semanal</option>
              <option value="mes">Mensual</option>
              <option value="ano">Anual</option>
            </select>
          </label>
          <label>
            Fecha de referencia
            <input
              type="date"
              name="fecha"
              required
              min="2000-01-01"
              max="2100-12-31"
              defaultValue={filters.fecha}
            />
          </label>
          <button className="boton">Consultar período</button>
        </form>
      </section>
      <ResourceState {...resource} onRetry={resource.reload} />
      {resource.data && (
        <>
          <section className="habit-period-summary">
            <div>
              <span>Completados</span>
              <strong>
                <AnimatedNumber
                  value={resource.data.resumenPeriodo.completados}
                />
              </strong>
            </div>
            <div>
              <span>Programados</span>
              <strong>
                <AnimatedNumber
                  value={resource.data.resumenPeriodo.programados}
                />
              </strong>
            </div>
            <div>
              <span>Cumplimiento</span>
              <strong>
                <AnimatedNumber
                  value={resource.data.resumenPeriodo.porcentaje}
                  suffix="%"
                />
              </strong>
            </div>
          </section>
          <TrendChart
            title={`${resource.data.rango.desde} — ${resource.data.rango.hasta}`}
            days={resource.data.serie}
          />
          <section className="dashboard-card">
            <h2>Cumplimiento por hábito</h2>
            <div className="habit-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hábito</th>
                    <th>Racha actual</th>
                    <th>Mejor racha</th>
                    <th>Cumplimiento</th>
                    <th>Objetivo de hoy</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.porHabito.map((habit) => (
                    <tr key={habit.id}>
                      <td>{habit.nombre}</td>
                      <td>{habit.rachaActual}</td>
                      <td>{habit.mejorRacha}</td>
                      <td>
                        {habit.porcentaje == null
                          ? "—"
                          : `${habit.porcentaje}%`}
                      </td>
                      <td>
                        {habit.hoy.cantidad} / {habit.hoy.objetivo}{" "}
                        {habit.hoy.unidad}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!resource.data.porHabito.length && (
              <p>Las estadísticas aparecerán cuando registres tus hábitos.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
