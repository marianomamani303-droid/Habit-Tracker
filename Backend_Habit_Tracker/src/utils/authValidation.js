import { HttpError } from "./HttpError.js";

function validateBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "El formulario debe ser un objeto JSON.");
  }
}

function text(value, label, maximum) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, `${label} es obligatorio.`);
  }
  const result = value.trim();
  if (result.length > maximum) {
    throw new HttpError(400, `${label} admite hasta ${maximum} caracteres.`);
  }
  return result;
}

function email(value) {
  const result = text(value, "El email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) {
    throw new HttpError(400, "Introduce un email válido.");
  }
  return result;
}

function password(value, minimum) {
  if (typeof value !== "string" || value.length < minimum || !value.trim()) {
    throw new HttpError(
      400,
      `La contraseña debe tener al menos ${minimum} caracteres.`,
    );
  }
  // bcrypt considera solo los primeros 72 bytes, incluso con emojis.
  if (Buffer.byteLength(value, "utf8") > 72) {
    throw new HttpError(400, "La contraseña no puede superar 72 bytes UTF-8.");
  }
  return value;
}

export function validateRegister(body) {
  validateBody(body);
  const result = {
    nombre: text(body.nombre, "El nombre", 100),
    apellido: text(body.apellido, "El apellido", 100),
    email: email(body.email),
    password: password(body.password, 8),
  };
  if (
    typeof body.confirmar !== "string" ||
    result.password !== body.confirmar
  ) {
    throw new HttpError(400, "Las contraseñas deben coincidir.");
  }
  return result;
}

export function validateLogin(body) {
  validateBody(body);
  return { email: email(body.email), password: password(body.password, 1) };
}
