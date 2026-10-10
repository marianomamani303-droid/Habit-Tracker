import { HttpError } from "../utils/HttpError.js";

export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof HttpError) {
    return res.status(error.status).json({ mensaje: error.message });
  }
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ mensaje: "El cuerpo JSON no es válido." });
  }
  if (error.type === "entity.too.large") {
    return res
      .status(413)
      .json({ mensaje: "El formulario es demasiado grande." });
  }
  if (error.status === 415) {
    return res
      .status(415)
      .json({ mensaje: "El formato de la petición no es compatible." });
  }

  // No registramos bodies, cookies, SQL, secretos ni stack traces.
  console.error(
    "Error interno en la API:",
    error.code ?? error.name ?? "Error",
  );
  return res
    .status(500)
    .json({ mensaje: "Ocurrió un error interno. Inténtalo más tarde." });
}
