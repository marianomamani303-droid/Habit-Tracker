import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { HttpError } from "../utils/HttpError.js";
import * as controller from "../controllers/experienceController.js";

const router = Router();
router.use((req, _res, next) => {
  if (!/^\/(?:perfil|logros|notificaciones)(?:\/|$)/.test(req.path))
    return next("router");
  next();
});
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { mensaje: "Demasiados intentos. Volvé a intentar en 15 minutos." },
});
router.use(authMiddleware);
router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    !req.is("application/json")
  )
    return next(
      new HttpError(415, "Las operaciones requieren application/json."),
    );
  next();
});
router.get("/perfil", controller.getProfile);
router.put("/perfil", controller.updateProfile);
router.get("/perfil/avatar", controller.getAvatar);
router.put("/perfil/avatar", passwordLimiter, controller.saveAvatar);
router.post("/perfil/password", passwordLimiter, controller.changePassword);
router.get("/logros", controller.achievements);
router.post("/logros/vistos", controller.acknowledge);
router.get("/notificaciones", controller.notifications);
router.patch("/notificaciones/leidas", controller.readNotification);
router.patch("/notificaciones/:id", controller.readNotification);
export default router;
