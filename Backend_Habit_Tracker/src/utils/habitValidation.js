import { HttpError } from "./HttpError.js";
import { today, addDays } from "./habitCalendar.js";

export function invalid(message = "Datos de hábito inválidos.") {
  return new HttpError(400, message);
}

export function dateValue(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < "2000-01-01" ||
    value > "2100-12-31"
  )
    throw invalid("Fecha inválida.");
  try {
    if (addDays(value, 0) !== value) throw invalid("Fecha inválida.");
  } catch {
    throw invalid("Fecha inválida.");
  }
  return value;
}

export function idValue(value) {
  const identifier = Number(value);
  if (
    !/^[1-9]\d*$/.test(String(value)) ||
    !Number.isSafeInteger(identifier) ||
    identifier > 4294967295
  )
    throw invalid("Identificador inválido.");
  return identifier;
}

export function quantityValue(value, minimum = 0) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > 1000000 ||
    Math.abs(value * 1000 - Math.round(value * 1000)) > 0.00001
  ) {
    throw invalid("Cantidad inválida: hasta tres decimales y máximo 1000000.");
  }
  return value;
}

function textValue(value, maximum, required = false) {
  if (
    typeof value !== "string" ||
    value.trim().length > maximum ||
    (required && !value.trim())
  )
    throw invalid("Nombre, descripción o unidad inválidos.");
  return value.trim();
}

function weekdaysValue(days, frequency) {
  if (
    !Array.isArray(days) ||
    days.some((day) => !Number.isInteger(day) || day < 1 || day > 7) ||
    new Set(days).size !== days.length ||
    (frequency === "dias" && !days.length)
  ) {
    throw invalid("Elegí días de la semana válidos.");
  }
  return [...days].sort().join(",");
}

export function validateHabit(body, timeZone) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw invalid();
  const { frecuencia, inicio, objetivo, dias = [], dias_semana = 1 } = body;
  if (!["diario", "semanal", "dias", "personalizado"].includes(frecuencia))
    throw invalid("Frecuencia inválida.");
  if (!Number.isInteger(dias_semana) || dias_semana < 1 || dias_semana > 7) {
    throw invalid("El objetivo semanal debe estar entre 1 y 7 días.");
  }
  dateValue(inicio);
  if (inicio < addDays(today(timeZone), -3660))
    throw invalid("El inicio no puede superar diez años de antigüedad.");
  const interval = frecuencia === "personalizado" ? body.intervalo_dias : 1;
  if (!Number.isInteger(interval) || interval < 1 || interval > 365)
    throw invalid("El intervalo debe ser entre 1 y 365 días.");
  return {
    nombre: textValue(body.nombre, 120, true),
    descripcion: textValue(body.descripcion ?? "", 1000),
    unidad: textValue(body.unidad ?? "", 40),
    frecuencia: frecuencia === "personalizado" ? "diario" : frecuencia,
    intervalo_dias: interval,
    inicio,
    objetivo: quantityValue(objetivo, 0.001),
    dias: weekdaysValue(dias, frecuencia),
    dias_semana,
  };
}
