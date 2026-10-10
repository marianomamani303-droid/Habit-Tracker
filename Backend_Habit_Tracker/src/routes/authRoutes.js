import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { login, logout, me, register } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { HttpError } from "../utils/HttpError.js";
import {
  requestRecovery,
  resetPassword,
} from "../controllers/experienceController.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    mensaje: "Demasiados intentos. Vuelve a intentarlo en 15 minutos.",
  },
});

// Impide enviar formularios cross-site simples: las escrituras requieren JSON.
router.use((req, _res, next) => {
  if (req.method === "POST" && !req.is("application/json")) {
    return next(
      new HttpError(415, "Envía el formulario como application/json."),
    );
  }
  next();
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/recuperar", authLimiter, requestRecovery);
router.post("/restablecer", authLimiter, resetPassword);
router.get("/me", authMiddleware, me);
router.post("/logout", logout);

export default router;
