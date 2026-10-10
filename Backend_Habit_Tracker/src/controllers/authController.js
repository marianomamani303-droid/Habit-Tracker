import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { cookieName, cookieOptions, jwtOptions } from "../config/auth.js";
import { config } from "../config/env.js";
import { loginUser, registerUser } from "../services/authService.js";
import {
  revokeSession,
  verifySessionToken,
} from "../services/sessionService.js";

export async function register(req, res) {
  const usuario = await registerUser(req.body);
  res.status(201).json({ mensaje: "Cuenta creada correctamente.", usuario });
}

export async function login(req, res) {
  const usuario = await loginUser(req.body);
  const token = jwt.sign(
    { id: usuario.id, sv: usuario.sesion_version },
    config.jwtSecret,
    {
      ...jwtOptions,
      jwtid: randomUUID(),
    },
  );

  res.cookie(cookieName, token, {
    ...cookieOptions,
    maxAge: config.jwtExpiresSeconds * 1000,
  });
  res.status(200).json({ mensaje: "Sesión iniciada correctamente.", usuario });
}

export async function me(req, res) {
  res.status(200).json({
    usuario: req.usuario,
    expiresInMs: Math.max(0, req.sessionExpiresAt * 1000 - Date.now()),
  });
}

export async function logout(req, res) {
  const token = req.cookies?.[cookieName];
  let payload;
  if (token) {
    try {
      payload = verifySessionToken(token);
    } catch {
      // Logout es idempotente incluso si la cookie ya expiró o es inválida.
    }
  }
  if (payload) await revokeSession(token, payload.exp);
  res.clearCookie(cookieName, cookieOptions);
  res.status(200).json({ mensaje: "Sesión cerrada correctamente." });
}
