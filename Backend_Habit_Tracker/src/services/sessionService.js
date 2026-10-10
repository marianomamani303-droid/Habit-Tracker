import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { pool } from "../config/db.js";

export function verifySessionToken(token) {
  const payload = jwt.verify(token, config.jwtSecret, {
    algorithms: ["HS256"],
    issuer: "habit-tracker-api",
    audience: "habit-tracker-web",
  });
  if (
    typeof payload !== "object" ||
    !Number.isSafeInteger(payload.id) ||
    payload.id < 1 ||
    !Number.isFinite(payload.exp)
  ) {
    throw new Error("Payload inválido.");
  }
  return payload;
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function isSessionRevoked(token) {
  const [rows] = await pool.execute(
    "SELECT token_hash FROM sesiones_revocadas WHERE token_hash = ? AND expira_en > UTC_TIMESTAMP() LIMIT 1",
    [tokenHash(token)],
  );
  return rows.length > 0;
}

export async function revokeSession(token, expiresAt) {
  // Se conserva solo un digest, nunca la cookie ni el JWT en texto plano.
  await pool.execute(
    "INSERT IGNORE INTO sesiones_revocadas (token_hash, expira_en) VALUES (?, ?)",
    [tokenHash(token), new Date(expiresAt * 1000)],
  );
}
