import { pool } from "../config/db.js";
import { HttpError } from "../utils/HttpError.js";

export async function withTransaction(operation) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function lockOwnedHabit(connection, userId, habitId) {
  const [rows] = await connection.execute(
    "SELECT id FROM habitos WHERE id = ? AND usuario_id = ? FOR UPDATE",
    [habitId, userId],
  );
  if (!rows.length) throw new HttpError(404, "Hábito no encontrado.");
}

export async function loadHabits(userId, connection = pool, range = {}) {
  const habitCondition = range.habitId ? "AND h.id = ?" : "";
  const parameters = range.habitId ? [userId, range.habitId] : [userId];
  const [habits] = await connection.execute(
    `SELECT h.id, h.nombre, h.descripcion, h.creado_en FROM habitos h WHERE h.usuario_id = ? ${habitCondition} ORDER BY h.id DESC`,
    parameters,
  );
  const [versions] = await connection.execute(
    `SELECT v.*, COALESCE(rule.intervalo_dias,1) intervalo_dias, DATE_FORMAT(v.desde, '%Y-%m-%d') desde,
       DATE_FORMAT(v.inicio, '%Y-%m-%d') inicio
     FROM habito_versiones v JOIN habitos h ON h.id = v.habito_id
     LEFT JOIN habito_reglas rule ON rule.version_id=v.id
     WHERE h.usuario_id = ? ${habitCondition} ORDER BY v.desde, v.id`,
    parameters,
  );
  const [records] = await connection.execute(
    `SELECT r.*, DATE_FORMAT(r.fecha, '%Y-%m-%d') fecha
     FROM habito_registros r JOIN habitos h ON h.id = r.habito_id
     WHERE h.usuario_id = ? ${habitCondition} ${range.from ? "AND r.fecha >= ? AND r.fecha <= ?" : ""} ORDER BY r.fecha`,
    range.from ? [...parameters, range.from, range.to] : parameters,
  );
  const versionsByHabit = groupByHabit(versions);
  const recordsByHabit = groupByHabit(records);
  const [tasks] = await connection.execute(
    `SELECT s.*, DATE_FORMAT(s.desde,'%Y-%m-%d') desde,
    DATE_FORMAT(s.hasta,'%Y-%m-%d') hasta FROM habito_subtareas s JOIN habitos h ON h.id=s.habito_id
    WHERE h.usuario_id=? ${habitCondition} ORDER BY s.id`,
    parameters,
  );
  const [taskRecords] = await connection.execute(
    `SELECT r.*, s.habito_id, DATE_FORMAT(r.fecha,'%Y-%m-%d') fecha
    FROM subtarea_registros r JOIN habito_subtareas s ON s.id=r.subtarea_id JOIN habitos h ON h.id=s.habito_id
    WHERE h.usuario_id=? ${habitCondition} ${range.from ? "AND r.fecha>=? AND r.fecha<=?" : ""}`,
    range.from ? [...parameters, range.from, range.to] : parameters,
  );
  const tasksByHabit = groupByHabit(tasks);
  const taskRecordsByHabit = groupByHabit(taskRecords);
  return habits.map((habit) => {
    const records = recordsByHabit.get(habit.id) ?? [];
    const result = {
      ...habit,
      versiones: versionsByHabit.get(habit.id) ?? [],
      registros: records,
      subtareas: tasksByHabit.get(habit.id) ?? [],
      subtareaRegistros: taskRecordsByHabit.get(habit.id) ?? [],
    };
    Object.defineProperty(result, "recordsByDate", {
      value: new Map(records.map((row) => [row.fecha, row])),
    });
    return result;
  });
}

function groupByHabit(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.habito_id)) groups.set(row.habito_id, []);
    groups.get(row.habito_id).push(row);
  }
  return groups;
}

export async function insertHabit(connection, userId, definition) {
  await connection.execute("SELECT id FROM usuarios WHERE id = ? FOR UPDATE", [
    userId,
  ]);
  const [[{ total }]] = await connection.execute(
    "SELECT COUNT(*) total FROM habitos WHERE usuario_id = ?",
    [userId],
  );
  if (total >= 100)
    throw new HttpError(409, "Límite de 100 hábitos por cuenta.");
  const [result] = await connection.execute(
    "INSERT INTO habitos (usuario_id, nombre, descripcion) VALUES (?, ?, ?)",
    [userId, definition.nombre, definition.descripcion],
  );
  return result.insertId;
}

export async function updateDefinition(
  connection,
  userId,
  habitId,
  effectiveDate,
  definition,
) {
  await connection.execute(
    `UPDATE habito_versiones SET frecuencia = ?, dias = ?, dias_semana = ?, objetivo = ?, unidad = ?
     WHERE habito_id = ? AND desde > ?`,
    [
      definition.frecuencia,
      definition.dias,
      definition.dias_semana,
      definition.objetivo,
      definition.unidad,
      habitId,
      effectiveDate,
    ],
  );
  await connection.execute(
    "UPDATE habitos SET nombre = ?, descripcion = ? WHERE id = ? AND usuario_id = ?",
    [definition.nombre, definition.descripcion, habitId, userId],
  );
  await connection.execute(
    `INSERT INTO habito_reglas (version_id,intervalo_dias)
    SELECT id,? FROM habito_versiones WHERE habito_id=? AND desde>?
    ON DUPLICATE KEY UPDATE intervalo_dias=VALUES(intervalo_dias)`,
    [definition.intervalo_dias ?? 1, habitId, effectiveDate],
  );
}

export async function updateArchiveStatus(
  connection,
  habitId,
  effectiveDate,
  archived,
) {
  await connection.execute(
    "UPDATE habito_versiones SET archivado = ? WHERE habito_id = ? AND desde >= ?",
    [archived ? 1 : 0, habitId, effectiveDate],
  );
}

export async function saveProgress(connection, habitId, date, quantity) {
  await connection.execute(
    `INSERT INTO habito_registros (habito_id, fecha, cantidad) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE cantidad = VALUES(cantidad)`,
    [habitId, date, quantity],
  );
}

export async function saveVersion(
  connection,
  habitId,
  effectiveDate,
  definition,
  archived = 0,
) {
  await connection.execute(
    `INSERT INTO habito_versiones
      (habito_id, desde, inicio, frecuencia, dias, dias_semana, objetivo, unidad, archivado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE inicio = VALUES(inicio), frecuencia = VALUES(frecuencia),
       dias = VALUES(dias), dias_semana = VALUES(dias_semana), objetivo = VALUES(objetivo),
       unidad = VALUES(unidad), archivado = VALUES(archivado)`,
    [
      habitId,
      effectiveDate,
      definition.inicio,
      definition.frecuencia,
      definition.dias,
      definition.dias_semana,
      definition.objetivo,
      definition.unidad,
      archived,
    ],
  );
  await connection.execute(
    `INSERT INTO habito_reglas (version_id,intervalo_dias)
    SELECT id,? FROM habito_versiones WHERE habito_id=? AND desde=?
    ON DUPLICATE KEY UPDATE intervalo_dias=VALUES(intervalo_dias)`,
    [definition.intervalo_dias ?? 1, habitId, effectiveDate],
  );
}
