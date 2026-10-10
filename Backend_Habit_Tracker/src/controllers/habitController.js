import * as service from "../services/habitService.js";
import { idValue } from "../utils/habitValidation.js";
export const list = async (req, res) =>
  res.json(
    await service.list(
      req.usuario.id,
      req.query.estado,
      req.usuario.zona_horaria,
    ),
  );
export const create = async (req, res) =>
  res.status(201).json({
    habito: await service.create(
      req.usuario.id,
      req.body,
      req.usuario.zona_horaria,
    ),
  });
export const detail = async (req, res) =>
  res.json({
    habito: await service.detail(
      req.usuario.id,
      idValue(req.params.id),
      req.usuario.zona_horaria,
    ),
  });
export const update = async (req, res) =>
  res.json({
    habito: await service.update(
      req.usuario.id,
      idValue(req.params.id),
      req.body,
      req.usuario.zona_horaria,
    ),
  });
export const archive = async (req, res) =>
  res.json({
    habito: await service.archive(
      req.usuario.id,
      idValue(req.params.id),
      req.method === "DELETE" ? true : req.body?.archivado,
      req.usuario.zona_horaria,
    ),
  });
export const progress = async (req, res) =>
  res.json({
    habito: await service.progress(
      req.usuario.id,
      idValue(req.params.id),
      req.params.fecha,
      req.body,
      req.usuario.zona_horaria,
    ),
  });
export const summary = async (req, res) =>
  res.json(await service.summary(req.usuario.id, req.usuario.zona_horaria));
export const statistics = async (req, res) =>
  res.json(
    await service.statistics(
      req.usuario.id,
      req.query,
      req.usuario.zona_horaria,
    ),
  );
export const history = async (req, res) =>
  res.json(
    await service.history(
      req.usuario.id,
      req.query.mes,
      req.usuario.zona_horaria,
    ),
  );
