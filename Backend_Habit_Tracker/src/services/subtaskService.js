import {
  loadHabits,
  lockOwnedHabit,
  saveProgress,
  withTransaction,
} from "../repositories/habitRepository.js";
import { daily, today, addDays, subtasksAt } from "../utils/habitCalendar.js";
import { requiredText } from "../utils/profileValidation.js";
import { dateValue, invalid } from "../utils/habitValidation.js";
import { HttpError } from "../utils/HttpError.js";

export async function mutateSubtask(
  userId,
  habitId,
  taskId,
  method,
  body,
  timeZone,
) {
  return withTransaction(async (connection) => {
    await lockOwnedHabit(connection, userId, habitId);
    const [habit] = await loadHabits(userId, connection, { habitId });
    const date = today(timeZone);
    if (method === "POST") {
      if (
        habit.subtareas.filter((task) => !task.hasta || task.hasta > date)
          .length >= 30
      )
        throw invalid("Máximo 30 subtareas por hábito.");
      const nombre = requiredText(body?.nombre, "Subtarea", 120);
      // Existing historical days never acquire new requirements. New habits can start today.
      const hasHistory =
        habit.registros.length || habit.versiones[0].inicio < date;
      const start = hasHistory
        ? addDays(date, 1)
        : habit.versiones[0].inicio > date
          ? habit.versiones[0].inicio
          : date;
      const [result] = await connection.execute(
        "INSERT INTO habito_subtareas (habito_id,nombre,desde) VALUES (?,?,?)",
        [habitId, nombre, start],
      );
      return { id: result.insertId, desde: start };
    }
    const task = habit.subtareas.find(
      (item) => item.id === taskId && (!item.hasta || item.hasta > date),
    );
    if (!task) throw new HttpError(404, "Subtarea no encontrada.");
    if (method === "DELETE") {
      const until = task.desde > date ? task.desde : addDays(date, 1);
      await connection.execute(
        "UPDATE habito_subtareas SET hasta=? WHERE id=?",
        [until, taskId],
      );
      return { hasta: until };
    }
    await connection.execute(
      "UPDATE habito_subtareas SET nombre=? WHERE id=?",
      [requiredText(body?.nombre, "Subtarea", 120), taskId],
    );
    return { id: taskId };
  });
}

export async function subtaskProgress(
  userId,
  habitId,
  taskId,
  date,
  body,
  timeZone,
) {
  dateValue(date);
  if (
    date > today(timeZone) ||
    date < addDays(today(timeZone), -3660) ||
    typeof body?.completado !== "boolean"
  )
    throw invalid("Fecha o estado de subtarea inválido.");
  await withTransaction(async (connection) => {
    await lockOwnedHabit(connection, userId, habitId);
    const [habit] = await loadHabits(userId, connection, { habitId });
    const tasks = subtasksAt(habit, date);
    if (!tasks.some((task) => task.id === taskId))
      throw new HttpError(404, "Subtarea no encontrada para esa fecha.");
    const day = daily(habit, date);
    if (!day.programado) throw invalid("El hábito no estaba programado.");
    await connection.execute(
      `INSERT INTO subtarea_registros (subtarea_id,fecha,completado) VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE completado=VALUES(completado)`,
      [taskId, date, body.completado ? 1 : 0],
    );
    const completed = tasks.filter((task) =>
      task.id === taskId ? body.completado : task.completado,
    ).length;
    await saveProgress(
      connection,
      habitId,
      date,
      Math.round(((day.objetivo * completed) / tasks.length) * 1000) / 1000,
    );
  });
}

export async function syncSubtasks(connection, habit, date, quantity) {
  const day = daily(habit, date);
  const tasks = subtasksAt(habit, date);
  if (!tasks.length) return;
  if (quantity !== 0 && quantity < day.objetivo)
    throw invalid("Usá las subtareas para registrar progreso parcial.");
  for (const task of tasks)
    await connection.execute(
      `INSERT INTO subtarea_registros (subtarea_id,fecha,completado) VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE completado=VALUES(completado)`,
      [task.id, date, quantity >= day.objetivo ? 1 : 0],
    );
}
