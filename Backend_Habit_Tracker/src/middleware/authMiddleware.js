import { cookieName } from "../config/auth.js";
import { getUserById } from "../services/authService.js";
import {
  isSessionRevoked,
  verifySessionToken,
} from "../services/sessionService.js";
import { HttpError } from "../utils/HttpError.js";

export async function authMiddleware(req, _res, next) {
  const token = req.cookies?.[cookieName];
  if (!token) {
    return next(new HttpError(401, "Debes iniciar sesión."));
  }

  let payload;
  try {
    payload = verifySessionToken(token);
  } catch {
    return next(
      new HttpError(
        401,
        "Sesión inválida o expirada. Inicia sesión nuevamente.",
      ),
    );
  }
  // Los errores de MySQL llegan al error handler como 500, no como 401.
  if (await isSessionRevoked(token)) {
    throw new HttpError(
      401,
      "La sesión fue cerrada. Inicia sesión nuevamente.",
    );
  }
  req.usuario = await getUserById(payload.id);
  if ((payload.sv ?? 0) !== req.usuario.sesion_version)
    throw new HttpError(401, "La contraseña cambió. Iniciá sesión nuevamente.");
  req.sessionExpiresAt = payload.exp;
  next();
}
