import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

dotenv.config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});

function required(name) {
  const value = process.env[name];
  if (!value?.trim()) {
    throw new Error(`Configura ${name} en Backend_Habit_Tracker/.env.`);
  }
  return value;
}

function positiveInteger(name, fallback, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} debe ser un entero entre 1 y ${maximum}.`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("NODE_ENV debe ser development, test o production.");
}

const frontendUrl = required("FRONTEND_URL");
const frontendOrigin = new URL(frontendUrl);
if (
  !["http:", "https:"].includes(frontendOrigin.protocol) ||
  frontendOrigin.origin !== frontendUrl
) {
  throw new Error("FRONTEND_URL debe ser un origen sin ruta ni barra final.");
}

const jwtSecret = required("JWT_SECRET");
if (Buffer.byteLength(jwtSecret, "utf8") < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 bytes aleatorios.");
}

const cookieSameSite = process.env.COOKIE_SAME_SITE ?? "lax";
if (!["lax", "strict", "none"].includes(cookieSameSite)) {
  throw new Error("COOKIE_SAME_SITE debe ser lax, strict o none.");
}
if (cookieSameSite === "none" && nodeEnv !== "production") {
  throw new Error("SameSite=none requiere Secure y HTTPS en producción.");
}
if (nodeEnv === "production" && frontendOrigin.protocol !== "https:") {
  throw new Error("FRONTEND_URL debe usar HTTPS en producción.");
}

export const config = Object.freeze({
  nodeEnv,
  port: positiveInteger("PORT", 3000, 65535),
  frontendUrl,
  jwtSecret,
  jwtExpiresSeconds: positiveInteger("JWT_EXPIRES_SECONDS", 86400, 604800),
  cookieSameSite,
  db: {
    host: required("DB_HOST"),
    port: positiveInteger("DB_PORT", 3306, 65535),
    user: required("DB_USER"),
    password: process.env.DB_PASSWORD ?? "",
    database: required("DB_NAME"),
  },
});
