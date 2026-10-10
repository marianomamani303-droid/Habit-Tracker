import * as profile from "../services/profileService.js";
import * as recovery from "../services/recoveryService.js";
import * as medals from "../services/achievementService.js";
import * as reminders from "../services/reminderService.js";
import * as tasks from "../services/subtaskService.js";
import { detail } from "../services/habitService.js";
import { idValue } from "../utils/habitValidation.js";
import { cookieName, cookieOptions } from "../config/auth.js";

export const getProfile = async (req, res) =>
  res.json({ usuario: req.usuario });
export const updateProfile = async (req, res) =>
  res.json({ usuario: await profile.updateProfile(req.usuario.id, req.body) });
export const saveAvatar = async (req, res) => {
  await profile.saveAvatar(req.usuario.id, req.body);
  res.json({ mensaje: "Foto actualizada." });
};
export const getAvatar = async (req, res) =>
  res.type("image/webp").send(await profile.getAvatar(req.usuario.id));
export const changePassword = async (req, res) => {
  await profile.changePassword(req.usuario.id, req.body);
  res
    .clearCookie(cookieName, cookieOptions)
    .json({ mensaje: "Contraseña actualizada. Iniciá sesión nuevamente." });
};
export const requestRecovery = async (req, res) =>
  res.json(await recovery.requestRecovery(req.body));
export const resetPassword = async (req, res) => {
  const result = await recovery.resetPassword(req.body);
  res.clearCookie(cookieName, cookieOptions).json(result);
};
export const achievements = async (req, res) =>
  res.json(await medals.achievements(req.usuario.id, req.usuario.zona_horaria));
export const acknowledge = async (req, res) => {
  await medals.acknowledgeAchievements(req.usuario.id);
  res.json({ mensaje: "Logros vistos." });
};
export const notifications = async (req, res) =>
  res.json(
    await reminders.notifications(req.usuario.id, req.usuario.zona_horaria),
  );
export const readNotification = async (req, res) => {
  await reminders.readNotification(
    req.usuario.id,
    req.params.id ? idValue(req.params.id) : null,
  );
  res.json({ mensaje: "Recordatorios leídos." });
};
export const getReminder = async (req, res) =>
  res.json(await reminders.getReminder(req.usuario.id, idValue(req.params.id)));
export const setReminder = async (req, res) =>
  res.json(
    await reminders.setReminder(
      req.usuario.id,
      idValue(req.params.id),
      req.body,
      req.usuario.zona_horaria,
    ),
  );
export const mutateSubtask = async (req, res) => {
  const result = await tasks.mutateSubtask(
    req.usuario.id,
    idValue(req.params.id),
    req.params.taskId ? idValue(req.params.taskId) : null,
    req.method,
    req.body,
    req.usuario.zona_horaria,
  );
  res.status(req.method === "POST" ? 201 : 200).json(result);
};
export const subtaskProgress = async (req, res) => {
  await tasks.subtaskProgress(
    req.usuario.id,
    idValue(req.params.id),
    idValue(req.params.taskId),
    req.params.fecha,
    req.body,
    req.usuario.zona_horaria,
  );
  res.json({
    habito: await detail(
      req.usuario.id,
      idValue(req.params.id),
      req.usuario.zona_horaria,
    ),
  });
};
