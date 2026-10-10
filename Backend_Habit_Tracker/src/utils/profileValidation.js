import { HttpError } from "./HttpError.js";

export function requiredText(value, label, limit = 100) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > limit)
    throw new HttpError(400, `${label}: entre 1 y ${limit} caracteres.`);
  return value.trim();
}

export function timezoneValue(value) {
  if (typeof value !== "string" || value.length > 80)
    throw new HttpError(400, "Zona horaria inválida.");
  try {
    new Intl.DateTimeFormat("es", { timeZone: value });
  } catch {
    throw new HttpError(400, "Elegí una zona horaria IANA válida.");
  }
  return value;
}

export function newPassword(body) {
  const password = body?.password;
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    !password.trim() ||
    Buffer.byteLength(password, "utf8") > 72
  )
    throw new HttpError(
      400,
      "La contraseña debe tener al menos 8 caracteres y hasta 72 bytes UTF-8.",
    );
  if (password !== body.confirmar)
    throw new HttpError(400, "Las contraseñas deben coincidir.");
  return password;
}
