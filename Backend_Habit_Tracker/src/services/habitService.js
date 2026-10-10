import {
  loadHabits,
  withTransaction,
  lockOwnedHabit,
  saveVersion,
  insertHabit,
  updateDefinition,
  updateArchiveStatus,
  saveProgress,
} from "../repositories/habitRepository.js";
import { HttpError } from "../utils/HttpError.js";
import { pool } from "../config/db.js";
import { syncSubtasks } from "./subtaskService.js";
import { achievements } from "./achievementService.js";
import { statisticsRange, periodStatistics } from "../utils/statisticsRules.js";
import {
  today,
  addDays,
  monday,
  daily,
  metrics,
  versionAt,
  dates,
  TIME_ZONE,
  weeklyPeriod,
  periods,
} from "../utils/habitCalendar.js";
import {
  validateHabit,
  invalid,
  dateValue,
  quantityValue,
} from "../utils/habitValidation.js";

function serializeHabit(habit, date) {
  const { subtareaRegistros: _taskRecords, ...definition } = habit;
  return {
    ...definition,
    registros: habit.registros.slice(-90),
    configuracion: versionAt(habit, date),
    proximaConfiguracion:
      habit.versiones.find((version) => version.desde > date) ?? null,
    hoy: daily(habit, date),
    ...metrics(habit, date),
  };
}

function findHabit(habits, habitId) {
  const habit = habits.find((item) => item.id === habitId);
  if (!habit) throw new HttpError(404, "Hábito no encontrado.");
  return habit;
}

export async function list(userId, filter = "todos", timeZone = TIME_ZONE) {
  if (!["todos", "activos", "archivados", "completados"].includes(filter))
    throw invalid("Filtro inválido.");
  const date = today(timeZone);
  const habits = (await loadHabits(userId)).map((habit) =>
    serializeHabit(habit, date),
  );
  const filtered = habits.filter((habit) => {
    if (filter === "todos") return true;
    if (filter === "completados")
      return habit.hoy.programado && habit.hoy.completado;
    const archived = !!habit.configuracion?.archivado;
    return filter === "archivados" ? archived : !archived;
  });
  return { fecha: date, zonaHoraria: timeZone, habitos: filtered };
}

export async function detail(userId, habitId, timeZone = TIME_ZONE) {
  return serializeHabit(
    findHabit(await loadHabits(userId, pool, { habitId }), habitId),
    today(timeZone),
  );
}

export async function create(userId, body, timeZone = TIME_ZONE) {
  const definition = validateHabit(body, timeZone);
  const habitId = await withTransaction(async (connection) => {
    // Lock the account so concurrent creations cannot bypass the per-user limit.
    const identifier = await insertHabit(connection, userId, definition);
    await saveVersion(connection, identifier, definition.inicio, definition);
    return identifier;
  });
  return detail(userId, habitId, timeZone);
}

function effectiveEditDate(habit, definition, date) {
  const current = versionAt(habit, date) ?? habit.versiones[0];
  const weekly =
    current.frecuencia === "semanal" || definition.frecuencia === "semanal";
  const nextDate = weekly ? addDays(monday(date), 7) : addDays(date, 1);
  // Before the habit starts there is no history to reinterpret.
  return current.inicio > nextDate ? current.inicio : nextDate;
}

export async function update(userId, habitId, body, timeZone = TIME_ZONE) {
  const definition = validateHabit(body, timeZone);
  let effectiveDate;
  await withTransaction(async (connection) => {
    await lockOwnedHabit(connection, userId, habitId);
    const habit = findHabit(
      await loadHabits(userId, connection, { habitId }),
      habitId,
    );
    const current = versionAt(habit, today(timeZone)) ?? habit.versiones[0];
    if (definition.inicio !== current.inicio)
      throw invalid("La fecha inicial se conserva para proteger el historial.");
    effectiveDate = effectiveEditDate(habit, definition, today(timeZone));
    const status = versionAt(habit, effectiveDate) ?? current;
    await saveVersion(
      connection,
      habitId,
      effectiveDate,
      definition,
      Number(status.archivado),
    );
    // A later scheduled edit must not accidentally reintroduce superseded settings.
    await updateDefinition(
      connection,
      userId,
      habitId,
      effectiveDate,
      definition,
    );
  });
  return {
    ...(await detail(userId, habitId, timeZone)),
    cambiosDesde: effectiveDate,
  };
}

export async function archive(userId, habitId, archived, timeZone = TIME_ZONE) {
  if (typeof archived !== "boolean") throw invalid("Estado inválido.");
  await withTransaction(async (connection) => {
    await lockOwnedHabit(connection, userId, habitId);
    const habit = findHabit(
      await loadHabits(userId, connection, { habitId }),
      habitId,
    );
    const tomorrow = addDays(today(timeZone), 1);
    const definition = versionAt(habit, tomorrow) ?? habit.versiones[0];
    const effectiveDate =
      definition.inicio > tomorrow ? definition.inicio : tomorrow;
    await saveVersion(
      connection,
      habitId,
      effectiveDate,
      definition,
      archived ? 1 : 0,
    );
    // Future objective edits remain intact while receiving the same archive status.
    await updateArchiveStatus(connection, habitId, effectiveDate, archived);
  });
  return detail(userId, habitId, timeZone);
}

export async function progress(
  userId,
  habitId,
  date,
  body,
  timeZone = TIME_ZONE,
) {
  dateValue(date);
  if (date > today(timeZone) || date < addDays(today(timeZone), -3660))
    throw invalid(
      "Solo se permiten registros de los últimos diez años, hasta hoy.",
    );
  const quantity = quantityValue(body?.cantidad);
  await withTransaction(async (connection) => {
    await lockOwnedHabit(connection, userId, habitId);
    const habit = findHabit(
      await loadHabits(userId, connection, { habitId }),
      habitId,
    );
    if (!daily(habit, date).programado)
      throw invalid("El hábito no estaba programado para esa fecha.");
    await syncSubtasks(connection, habit, date, quantity);
    await saveProgress(connection, habitId, date, quantity);
  });
  return detail(userId, habitId, timeZone);
}

function buildSummary(habits, date, timeZone = TIME_ZONE) {
  const active = habits.filter((habit) => !versionAt(habit, date)?.archivado);
  const due = active.filter((habit) => daily(habit, date).programado);
  const completed = due.filter((habit) => daily(habit, date).completado).length;
  return {
    disponible: true,
    fecha: date,
    zonaHoraria: timeZone,
    proximos: dates(addDays(date, 1), addDays(date, 7))
      .flatMap((day) =>
        habits
          .filter((habit) => daily(habit, day).programado)
          .map((habit) => ({ id: habit.id, nombre: habit.nombre, fecha: day })),
      )
      .slice(0, 5),
    habitos: due.map((habit) => serializeHabit(habit, date)),
    estadisticas: {
      total: active.length,
      completados: completed,
      pendientes: due.length - completed,
      programados: due.length,
      porcentaje: due.length
        ? Math.round((completed / due.length) * 100)
        : null,
    },
  };
}

export async function summary(userId, timeZone = TIME_ZONE) {
  const habits = await loadHabits(userId);
  return {
    ...buildSummary(habits, today(timeZone), timeZone),
    ...(await achievements(userId, timeZone, habits)),
  };
}

function calendarState(items, date, currentDate) {
  if (date > currentDate) return "futuro";
  if (!items.length) return "libre";
  if (items.every((item) => item.completado)) return "completo";
  if (items.some((item) => item.cantidad > 0 || item.subtareasCompletadas > 0))
    return "parcial";
  // A weekly opportunity is not an unmet daily obligation.
  return items.some((item) => item.frecuencia !== "semanal" && !item.completado)
    ? "pendiente"
    : "opcional-semanal";
}

export async function history(userId, month, timeZone = TIME_ZONE) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    throw invalid("Mes inválido.");
  const firstDate = dateValue(`${month}-01`);
  const nextMonth = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1, 12),
  )
    .toISOString()
    .slice(0, 10);
  const lastDate = addDays(nextMonth, -1);
  const habits = await loadHabits(userId, pool, {
    from: monday(firstDate),
    to: addDays(monday(lastDate), 6),
  });
  const currentDate = today(timeZone);
  const calendarDays = dates(firstDate, lastDate).map((date) => {
    const items = habits
      .map((habit) => ({
        id: habit.id,
        nombre: habit.nombre,
        ...daily(habit, date),
        periodoSemanal:
          versionAt(habit, date)?.frecuencia === "semanal"
            ? weeklyPeriod(habit, date, currentDate)
            : null,
      }))
      .filter((day) => day.programado);
    return {
      fecha: date,
      habitos: items,
      programados: items.length,
      completados: items.filter((item) => item.completado).length,
      estado: calendarState(items, date, currentDate),
    };
  });
  return {
    mes: month,
    fecha: currentDate,
    zonaHoraria: timeZone,
    dias: calendarDays,
  };
}

function evolutionForDate(periods, date, currentDate) {
  const evaluated = periods.filter(
    (period) =>
      period.fin === date && (date < currentDate || period.completado),
  );
  const completed = evaluated.filter((period) => period.completado).length;
  return {
    fecha: date,
    total: evaluated.length,
    completados: completed,
    porcentaje: evaluated.length
      ? Math.round((completed / evaluated.length) * 100)
      : null,
  };
}

export async function statistics(userId, query = {}, timeZone = TIME_ZONE) {
  const date = today(timeZone);
  const habits = await loadHabits(userId);
  const range = statisticsRange(query, date);
  const byHabit = habits.map((habit) => ({
    id: habit.id,
    nombre: habit.nombre,
    ...metrics(habit, date),
    ...periodStatistics([habit], range, date).resumenPeriodo,
    hoy: daily(habit, date),
  }));
  const allPeriods = habits.flatMap((habit) => periods(habit, date));
  const evolution = dates(addDays(date, -29), date).map((day) =>
    evolutionForDate(allPeriods, day, date),
  );
  return {
    ...buildSummary(habits, date, timeZone),
    rango: range,
    ...periodStatistics(habits, range, date),
    porHabito: byHabit,
    evolucion: evolution,
    semanal: evolution.slice(-7),
  };
}
