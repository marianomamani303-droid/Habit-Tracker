import { pool } from "../config/db.js";
import {
  loadHabits,
  withTransaction,
  lockOwnedHabit,
} from "../repositories/habitRepository.js";
import { today, addDays, dates, daily } from "../utils/habitCalendar.js";
import { invalid } from "../utils/habitValidation.js";
import { HttpError } from "../utils/HttpError.js";

export function localClock(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  return `${parts.find((p) => p.type === "hour").value}:${parts.find((p) => p.type === "minute").value}`;
}

export async function getReminder(userId, habitId) {
  const [rows] = await pool.execute(
    `SELECT r.hora,r.activo,DATE_FORMAT(r.desde,'%Y-%m-%d') desde
    FROM habitos h LEFT JOIN habito_recordatorios r ON r.habito_id=h.id WHERE h.id=? AND h.usuario_id=?`,
    [habitId, userId],
  );
  if (!rows.length) throw new HttpError(404, "Hábito no encontrado.");
  return { recordatorio: rows[0].hora ? rows[0] : null };
}

export async function setReminder(userId, habitId, body, timeZone) {
  if (
    typeof body?.activo !== "boolean" ||
    typeof body?.hora !== "string" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(body.hora)
  )
    throw invalid("Ingresá un horario válido.");
  await withTransaction(async (connection) => {
    await lockOwnedHabit(connection, userId, habitId);
    await connection.execute(
      `INSERT INTO habito_recordatorios (habito_id,hora,activo,desde) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE desde=IF(hora<>VALUES(hora) OR activo<>VALUES(activo),VALUES(desde),desde),
      hora=VALUES(hora),activo=VALUES(activo)`,
      [habitId, body.hora, body.activo ? 1 : 0, today(timeZone)],
    );
  });
  return getReminder(userId, habitId);
}

export async function notifications(userId, timeZone) {
  const now = new Date();
  const date = today(timeZone, now);
  const clock = localClock(timeZone, now);
  const habits = await loadHabits(userId, pool, {
    from: addDays(date, -6),
    to: date,
  });
  const [reminders] = await pool.execute(
    `SELECT r.*, DATE_FORMAT(r.desde,'%Y-%m-%d') desde FROM habito_recordatorios r
    JOIN habitos h ON h.id=r.habito_id WHERE h.usuario_id=? AND r.activo=TRUE`,
    [userId],
  );
  for (const reminder of reminders) {
    const habit = habits.find((h) => h.id === reminder.habito_id);
    const from =
      reminder.desde > addDays(date, -6) ? reminder.desde : addDays(date, -6);
    for (const day of dates(from, date)) {
      const state = daily(habit, day);
      if (
        !state.programado ||
        state.completado ||
        (day === date && reminder.hora > clock)
      )
        continue;
      await pool.execute(
        `INSERT IGNORE INTO usuario_notificaciones (usuario_id,habito_id,fecha,hora) VALUES (?,?,?,?)`,
        [userId, habit.id, day, reminder.hora],
      );
    }
  }
  const [rows] = await pool.execute(
    `SELECT n.id,n.habito_id,h.nombre,DATE_FORMAT(n.fecha,'%Y-%m-%d') fecha,n.hora,n.leido
    FROM usuario_notificaciones n JOIN habitos h ON h.id=n.habito_id
    WHERE n.usuario_id=? ORDER BY n.fecha DESC,n.hora DESC,n.id DESC LIMIT 100`,
    [userId],
  );
  const [[count]] = await pool.execute(
    "SELECT COUNT(*) pendientes FROM usuario_notificaciones WHERE usuario_id=? AND leido=FALSE",
    [userId],
  );
  return {
    notificaciones: rows,
    pendientes: count.pendientes,
    zonaHoraria: timeZone,
    fecha: date,
  };
}

export async function readNotification(userId, id) {
  if (id === null) {
    await pool.execute(
      "UPDATE usuario_notificaciones SET leido=TRUE WHERE usuario_id=?",
      [userId],
    );
    return;
  }
  const [result] = await pool.execute(
    "UPDATE usuario_notificaciones SET leido=TRUE WHERE id=? AND usuario_id=?",
    [id, userId],
  );
  if (!result.affectedRows)
    throw new HttpError(404, "Recordatorio no encontrado.");
}
