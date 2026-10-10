import bcrypt from "bcrypt";
import sharp from "sharp";
import { pool } from "../config/db.js";
import { bcryptRounds } from "../config/auth.js";
import { withTransaction } from "../repositories/habitRepository.js";
import { getUserById } from "./authService.js";
import {
  requiredText,
  timezoneValue,
  newPassword,
} from "../utils/profileValidation.js";
import { HttpError } from "../utils/HttpError.js";

export async function updateProfile(userId, body) {
  const nombre = requiredText(body?.nombre, "Nombre");
  const apellido = requiredText(body?.apellido, "Apellido");
  const zona = timezoneValue(body?.zona_horaria);
  if (typeof body?.bio !== "string" || body.bio.length > 280)
    throw new HttpError(400, "La biografía admite hasta 280 caracteres.");
  await withTransaction(async (connection) => {
    await connection.execute(
      "UPDATE usuarios SET nombre=?, apellido=? WHERE id=?",
      [nombre, apellido, userId],
    );
    await connection.execute(
      `INSERT INTO usuario_perfiles (usuario_id,zona_horaria,bio) VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE zona_horaria=VALUES(zona_horaria),bio=VALUES(bio)`,
      [userId, zona, body.bio.trim()],
    );
  });
  return getUserById(userId);
}

export async function normalizeAvatar(body) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(body?.tipo) ||
    typeof body?.imagen !== "string" ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(body.imagen) ||
    body.imagen.length % 4
  )
    throw new HttpError(400, "Subí una imagen JPEG, PNG o WebP válida.");
  const input = Buffer.from(body.imagen, "base64");
  if (!input.length || input.length > 2 * 1024 * 1024)
    throw new HttpError(413, "La foto debe pesar hasta 2 MB.");
  try {
    const image = sharp(input, {
      limitInputPixels: 16000000,
      failOn: "warning",
    });
    const metadata = await image.metadata();
    const formats = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
    };
    if (metadata.format !== formats[body.tipo] || (metadata.pages ?? 1) > 1)
      throw new Error("Invalid format");
    // New encoding strips metadata and any appended content. SVG is never accepted.
    return await image
      .rotate()
      .resize(256, 256, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    throw new HttpError(
      400,
      "El contenido de la foto no es válido o supera 16 megapíxeles.",
    );
  }
}

export async function saveAvatar(userId, body) {
  const avatar = await normalizeAvatar(body);
  await pool.execute(
    `INSERT INTO usuario_perfiles (usuario_id,avatar) VALUES (?,?)
    ON DUPLICATE KEY UPDATE avatar=VALUES(avatar)`,
    [userId, avatar],
  );
}

export async function getAvatar(userId) {
  const [rows] = await pool.execute(
    "SELECT avatar FROM usuario_perfiles WHERE usuario_id=?",
    [userId],
  );
  if (!rows[0]?.avatar) throw new HttpError(404, "Todavía no tenés una foto.");
  return rows[0].avatar;
}

export async function changePassword(userId, body) {
  const password = newPassword(body);
  if (typeof body?.actual !== "string" || Buffer.byteLength(body.actual) > 72)
    throw new HttpError(400, "Ingresá la contraseña actual.");
  const hash = await bcrypt.hash(password, bcryptRounds);
  await withTransaction(async (connection) => {
    const [rows] = await connection.execute(
      "SELECT password_hash FROM usuarios WHERE id=? FOR UPDATE",
      [userId],
    );
    if (!rows[0] || !(await bcrypt.compare(body.actual, rows[0].password_hash)))
      throw new HttpError(400, "La contraseña actual no es correcta.");
    await connection.execute("UPDATE usuarios SET password_hash=? WHERE id=?", [
      hash,
      userId,
    ]);
    await invalidateSessions(connection, userId);
  });
}

export async function invalidateSessions(connection, userId) {
  await connection.execute(
    `INSERT INTO usuario_perfiles (usuario_id,sesion_version) VALUES (?,1)
    ON DUPLICATE KEY UPDATE sesion_version=sesion_version+1`,
    [userId],
  );
  await connection.execute(
    "UPDATE password_recuperaciones SET usado_en=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_en IS NULL",
    [userId],
  );
}
