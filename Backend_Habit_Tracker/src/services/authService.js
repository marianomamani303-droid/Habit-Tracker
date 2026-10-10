import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";
import { bcryptRounds } from "../config/auth.js";
import { pool } from "../config/db.js";
import { HttpError } from "../utils/HttpError.js";
import { validateLogin, validateRegister } from "../utils/authValidation.js";

// También comparamos un hash si el email no existe, para reducir diferencias
// de tiempo entre un usuario inexistente y una contraseña incorrecta.
const dummyHash = await bcrypt.hash(
  randomBytes(32).toString("hex"),
  bcryptRounds,
);

function publicUser(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    zona_horaria: usuario.zona_horaria ?? "America/Argentina/Buenos_Aires",
    bio: usuario.bio ?? "",
    tiene_avatar: !!usuario.tiene_avatar,
    sesion_version: Number(usuario.sesion_version ?? 0),
  };
}

export async function registerUser(body) {
  const { nombre, apellido, email, password } = validateRegister(body);
  const [existing] = await pool.execute(
    "SELECT id FROM usuarios WHERE email = ? LIMIT 1",
    [email],
  );
  if (existing.length) {
    throw new HttpError(409, "Este email ya está registrado.");
  }

  const passwordHash = await bcrypt.hash(password, bcryptRounds);
  try {
    const [result] = await pool.execute(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash)
       VALUES (?, ?, ?, ?)`,
      [nombre, apellido, email, passwordHash],
    );
    return publicUser({ id: result.insertId, nombre, apellido, email });
  } catch (error) {
    // UNIQUE también protege dos registros simultáneos del mismo email.
    if (error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "Este email ya está registrado.");
    }
    throw error;
  }
}

export async function loginUser(body) {
  const { email, password } = validateLogin(body);
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre, u.apellido, u.email, u.password_hash,
      p.zona_horaria, p.bio, p.avatar IS NOT NULL tiene_avatar, p.sesion_version
     FROM usuarios u LEFT JOIN usuario_perfiles p ON p.usuario_id=u.id WHERE u.email = ? LIMIT 1`,
    [email],
  );
  const usuario = rows[0];
  const matches = await bcrypt.compare(
    password,
    usuario?.password_hash ?? dummyHash,
  );
  if (!usuario || !matches) {
    throw new HttpError(401, "Email o contraseña incorrectos.");
  }
  return publicUser(usuario);
}

export async function getUserById(id) {
  const [rows] = await pool.execute(
    `SELECT u.id, u.nombre, u.apellido, u.email, p.zona_horaria, p.bio,
      p.avatar IS NOT NULL tiene_avatar, p.sesion_version
      FROM usuarios u LEFT JOIN usuario_perfiles p ON p.usuario_id=u.id WHERE u.id = ? LIMIT 1`,
    [id],
  );
  if (!rows.length) {
    throw new HttpError(
      401,
      "La sesión ya no es válida. Inicia sesión nuevamente.",
    );
  }
  return publicUser(rows[0]);
}
