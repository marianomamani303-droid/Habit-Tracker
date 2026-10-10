import { useState } from "react";
import { habitToday } from "../../utils/habitCalendar";
import WeekdaySelector from "./WeekdaySelector";
import { useAuth } from "../../hooks/useAuth";
export default function HabitForm({ initial, onSave, busy }) {
  const { usuario } = useAuth();
  const definition =
    initial?.proximaConfiguracion ??
    initial?.configuracion ??
    initial?.versiones?.[0];
  const [frequency, setFrequency] = useState(
    Number(definition?.intervalo_dias ?? 1) > 1
      ? "personalizado"
      : (definition?.frecuencia ?? "diario"),
  );
  const [days, setDays] = useState(
    definition?.dias?.split(",").filter(Boolean).map(Number) ?? [],
  );
  const [initialDate] = useState(
    () => definition?.inicio ?? habitToday(usuario.zona_horaria),
  );
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await onSave({
      nombre: form.get("nombre"),
      descripcion: form.get("descripcion"),
      inicio: form.get("inicio"),
      frecuencia: frequency,
      dias: frequency === "dias" ? days : [],
      dias_semana: Number(form.get("dias_semana") ?? 1),
      objetivo: Number(form.get("objetivo")),
      unidad: form.get("unidad"),
      intervalo_dias: Number(form.get("intervalo_dias") ?? 1),
    });
  }
  return (
    <form className="habit-form" onSubmit={submit}>
      <label>
        Nombre
        <input
          name="nombre"
          maxLength="120"
          required
          defaultValue={initial?.nombre ?? ""}
        />
      </label>
      <label>
        Descripción
        <textarea
          name="descripcion"
          maxLength="1000"
          defaultValue={initial?.descripcion ?? ""}
        />
      </label>
      <div className="habit-form-grid">
        <label>
          Frecuencia
          <select
            aria-label="Frecuencia"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            <option value="diario">Diario</option>
            <option value="semanal">Días por semana</option>
            <option value="dias">Semanal · días específicos</option>
            <option value="personalizado">Personalizado · cada N días</option>
          </select>
        </label>
        <label>
          Fecha de inicio
          <input
            name="inicio"
            type="date"
            min="2000-01-01"
            max="2100-12-31"
            required
            readOnly={!!initial}
            defaultValue={initialDate}
          />
        </label>
      </div>
      {frequency === "dias" && (
        <WeekdaySelector selectedDays={days} onChange={setDays} />
      )}
      {frequency === "semanal" && (
        <label>
          Días a completar por semana
          <input
            type="number"
            name="dias_semana"
            required
            min="1"
            max="7"
            defaultValue={definition?.dias_semana ?? 3}
          />
        </label>
      )}
      {frequency === "personalizado" && (
        <label>
          Cada cuántos días
          <input
            name="intervalo_dias"
            type="number"
            min={1}
            max={365}
            required
            defaultValue={definition?.intervalo_dias ?? 2}
          />
          <small>La frecuencia se calcula desde la fecha de inicio.</small>
        </label>
      )}
      <div className="habit-form-grid">
        <label>
          Objetivo por día
          <input
            name="objetivo"
            type="number"
            min="0.001"
            max="1000000"
            step="0.001"
            required
            defaultValue={definition?.objetivo ?? 1}
          />
        </label>
        <label>
          Unidad (opcional)
          <input
            name="unidad"
            maxLength="40"
            placeholder="páginas, litros, minutos…"
            defaultValue={definition?.unidad ?? ""}
          />
        </label>
      </div>
      <p>
        Para hábitos binarios, usá objetivo 1: registrá 1 para completar o 0
        para desmarcar.
      </p>
      {initial && (
        <p>
          El historial se conserva. Los cambios de objetivo y frecuencia rigen
          desde mañana; si involucran frecuencia semanal, desde el próximo
          lunes.
        </p>
      )}
      <button
        className="boton"
        disabled={busy || (frequency === "dias" && !days.length)}
      >
        {busy ? "Guardando…" : initial ? "Guardar cambios" : "Crear hábito"}
      </button>
    </form>
  );
}
