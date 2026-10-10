import { config } from "./env.js";

export const cookieName = "habitly_session";
export const bcryptRounds = 12;

// Se reutilizan estas opciones al guardar y eliminar la cookie.
export const cookieOptions = Object.freeze({
  httpOnly: true,
  secure: config.nodeEnv === "production",
  sameSite: config.cookieSameSite,
  path: "/api",
});

export const jwtOptions = Object.freeze({
  algorithm: "HS256",
  expiresIn: config.jwtExpiresSeconds,
  issuer: "habit-tracker-api",
  audience: "habit-tracker-web",
});
