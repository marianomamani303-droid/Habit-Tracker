import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { pool } from "../config/db.js";
import { config } from "../config/env.js";
import { bcryptRounds } from "../config/auth.js";
import { withTransaction } from "../repositories/habitRepository.js";
import { invalidateSessions } from "./profileService.js";
import { newPassword } from "../utils/profileValidation.js";
import { HttpError } from "../utils/HttpError.js";

export const hashResetToken = (token) =>
  createHash("sha256").update(token).digest("hex");
const genericMessage =
  "Si el correo está registrado, recibirás un enlace para recuperar tu contraseña.";

export function mailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function requestRecovery(body) {
  const startedAt = Date.now();
  const uniformResponse = async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, Math.max(0, 500 - (Date.now() - startedAt))),
    );
    return { mensaje: genericMessage };
  };
  if (
    typeof body?.email !== "string" ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  )
    throw new HttpError(400, "Ingresá un correo válido.");
  // Identical availability response for every address, without claiming mail was sent.
  if (!mailConfigured())
    throw new HttpError(
      503,
      "La recuperación por correo todavía no está configurada. Contactá al administrador.",
    );
  const [rows] = await pool.execute("SELECT id FROM usuarios WHERE email=?", [
    body.email.trim().toLowerCase(),
  ]);
  if (!rows.length) return uniformResponse();
  const token = randomBytes(32).toString("hex");
  const digest = hashResetToken(token);
  const allowed = await withTransaction(async (connection) => {
    await connection.execute("SELECT id FROM usuarios WHERE id=? FOR UPDATE", [
      rows[0].id,
    ]);
    const [recent] = await connection.execute(
      "SELECT token_hash FROM password_recuperaciones WHERE usuario_id=? AND expira_en > DATE_ADD(UTC_TIMESTAMP(),INTERVAL 29 MINUTE) LIMIT 1",
      [rows[0].id],
    );
    if (recent.length) return false;
    await connection.execute(
      "INSERT INTO password_recuperaciones (token_hash,usuario_id,expira_en) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE))",
      [digest, rows[0].id],
    );
    return true;
  });
  if (allowed)
    void deliverRecovery(body.email.trim().toLowerCase(), token, digest).catch(
      () => {
        console.error(
          "Falló el procesamiento del correo de recuperación. Revisá SMTP y MySQL.",
        );
      },
    );
  return uniformResponse();
}

async function deliverRecovery(email, token, digest) {
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_SECURE !== "true",
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Recuperá tu acceso a Habitly",
      text: `Usá este enlace dentro de 30 minutos: ${config.frontendUrl}/recuperar#token=${token}\nSi no lo solicitaste, ignorá este mensaje.`,
    });
  } catch {
    await pool.execute(
      "UPDATE password_recuperaciones SET usado_en=UTC_TIMESTAMP() WHERE token_hash=?",
      [digest],
    );
    // Do not reveal whether SMTP failed for a registered address.
    console.error(
      "No se pudo entregar un correo de recuperación. Revisá SMTP.",
    );
  } finally {
    transport.close();
  }
}

export async function resetPassword(body) {
  const password = newPassword(body);
  if (typeof body?.token !== "string" || !/^[a-f0-9]{64}$/.test(body.token))
    throw new HttpError(400, "El enlace es inválido o expiró.");
  const digest = hashResetToken(body.token);
  const hash = await bcrypt.hash(password, bcryptRounds);
  await withTransaction(async (connection) => {
    const [tokens] = await connection.execute(
      "SELECT usuario_id FROM password_recuperaciones WHERE token_hash=?",
      [digest],
    );
    if (!tokens.length)
      throw new HttpError(400, "El enlace es inválido o expiró.");
    // Same lock order as change-password/recovery avoids deadlocks.
    await connection.execute("SELECT id FROM usuarios WHERE id=? FOR UPDATE", [
      tokens[0].usuario_id,
    ]);
    const [result] = await connection.execute(
      "UPDATE password_recuperaciones SET usado_en=UTC_TIMESTAMP() WHERE token_hash=? AND usado_en IS NULL AND expira_en>UTC_TIMESTAMP()",
      [digest],
    );
    if (result.affectedRows !== 1)
      throw new HttpError(400, "El enlace es inválido o expiró.");
    await connection.execute("UPDATE usuarios SET password_hash=? WHERE id=?", [
      hash,
      tokens[0].usuario_id,
    ]);
    await invalidateSessions(connection, tokens[0].usuario_id);
  });
  return { mensaje: "Contraseña actualizada. Iniciá sesión nuevamente." };
}
