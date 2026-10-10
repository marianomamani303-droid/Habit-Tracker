import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useHabitsResource } from "../hooks/useHabitsResource";
import HabitCard from "../componentes/habits/HabitCard";
import ResourceState from "../componentes/habits/ResourceState";
import { habitToday } from "../utils/habitCalendar";
const weekdayNames = ["L", "M", "X", "J", "V", "S", "D"];

function shiftMonth(month, amount) {
  const date = new Date(`${month}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

export default function Historial() {
  const { habits, usuario } = useOutletContext();
  const [month, setMonth] = useState(() =>
    habitToday(usuario.zona_horaria).slice(0, 7),
  );
  const [selectedDate, setSelectedDate] = useState("");
  const resource = useHabitsResource("history", month);
  const selected = resource.data?.dias.find(
    (day) => day.fecha === selectedDate,
  );
  const firstWeekday = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  function changeMonth(amount) {
    setMonth((previous) => shiftMonth(previous, amount));
    setSelectedDate("");
  }
  return (
    <>
      <section className="dashboard-card">
        <div className="dashboard-section-header">
          <h2>Historial · {month}</h2>
          <div className="habit-actions">
            <button
              aria-label="Mes anterior"
              onClick={() => changeMonth(-1)}
              disabled={month <= "2000-01"}
            >
              ←
            </button>
            <button
              aria-label="Mes siguiente"
              onClick={() => changeMonth(1)}
              disabled={month >= "2100-12"}
            >
              →
            </button>
          </div>
        </div>
        <p>
          Zona horaria: {usuario.zona_horaria}. Los hábitos semanales admiten
          días opcionales; su cumplimiento se evalúa por semana.
        </p>
        <ResourceState {...resource} onRetry={resource.reload} />
        {resource.data && (
          <div className="habit-calendar">
            {weekdayNames.map((name, index) => (
              <span key={index} aria-hidden="true">
                {name}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {resource.data.dias.map((day) => (
              <button
                key={day.fecha}
                className={`calendar-day ${day.estado}`}
                aria-pressed={selectedDate === day.fecha}
                aria-label={`${day.fecha}, ${day.estado}, ${day.completados} de ${day.programados} hábitos completados`}
                onClick={() => setSelectedDate(day.fecha)}
              >
                <strong>{Number(day.fecha.slice(8))}</strong>
                <span>
                  {day.programados
                    ? `${day.completados}/${day.programados}`
                    : "—"}
                </span>
              </button>
            ))}
          </div>
        )}
        <p className="habit-calendar-legend">
          Verde: completado · Ámbar: parcial · Gris: libre o futuro · Semanal:
          días opcionales.
        </p>
      </section>
      <section className="dashboard-card">
        <h2>
          {selectedDate
            ? `Registros del ${selectedDate}`
            : "Seleccioná una fecha"}
        </h2>
        {selected && (
          <div className="habit-list">
            {selected.habitos.map((habit) => (
              <HabitCard
                key={habit.id + selectedDate}
                habit={habit}
                date={selectedDate}
                actions={selectedDate <= resource.data.fecha}
                onChange={() => {
                  resource.reload();
                  habits.retry();
                }}
              />
            ))}
            {!selected.habitos.length && <p>No había hábitos programados.</p>}
          </div>
        )}
      </section>
    </>
  );
}
