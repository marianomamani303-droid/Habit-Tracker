import { useState } from "react";

export default function TrendChart({ title, days }) {
  const [selected, setSelected] = useState(null);
  const current = days.find((day) => day.fecha === selected);
  return (
    <section className="dashboard-card">
      <h2>{title}</h2>
      <p className="habit-section-intro">
        Cada barra muestra los hábitos cumplidos sobre las obligaciones
        programadas. El día actual cuenta aunque siga pendiente; los días
        futuros no cuentan. Las metas semanales flexibles se agrupan por la
        fecha del domingo.
      </p>
      <div
        className="habit-chart"
        aria-label="Explorá el cumplimiento por fecha"
      >
        {days.map((day) => (
          <button
            className="habit-chart-column"
            key={day.fecha}
            title={`${day.fecha}: ${day.completados}/${day.total}`}
            type="button"
            aria-label={`${day.fecha}: ${day.completados} de ${day.total}, ${day.porcentaje == null ? "sin actividad" : `${day.porcentaje}%`}`}
            aria-pressed={selected === day.fecha}
            onClick={() => setSelected(day.fecha)}
            onFocus={() => setSelected(day.fecha)}
            onMouseEnter={() => setSelected(day.fecha)}
          >
            <div className="habit-chart-track">
              <div style={{ height: `${day.porcentaje ?? 0}%` }} />
            </div>
            <span>{day.label ?? day.fecha.slice(8)}</span>
          </button>
        ))}
      </div>
      <p className="habit-chart-detail" role="status">
        {current
          ? `${current.fecha} · ${current.completados} / ${current.total} · ${current.porcentaje == null ? "Sin obligaciones programadas" : `${current.porcentaje}% de cumplimiento`}`
          : "Tocá una barra para ver el detalle."}
      </p>
      {!days.some((day) => day.total > 0) && (
        <p className="habit-section-intro">
          No hay actividad programada en este período. Tu progreso aparecerá
          cuando empieces.
        </p>
      )}
      <details>
        <summary>Ver datos del gráfico</summary>
        <div className="habit-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cumplidos</th>
                <th>Evaluados</th>
                <th>Porcentaje</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.fecha}>
                  <td>{day.fecha}</td>
                  <td>{day.completados}</td>
                  <td>{day.total}</td>
                  <td>{day.porcentaje == null ? "—" : `${day.porcentaje}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
