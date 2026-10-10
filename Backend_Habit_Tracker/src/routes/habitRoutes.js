import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { HttpError } from "../utils/HttpError.js";
import * as habitController from "../controllers/habitController.js";
import * as experience from "../controllers/experienceController.js";
const router = Router();
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
router.get("/resumen", habitController.summary);
router.get("/estadisticas", habitController.statistics);
router.get("/historial", habitController.history);
router.get("/", habitController.list);
router.post("/", habitController.create);
router.get("/:id", habitController.detail);
router.put("/:id", habitController.update);
router.patch("/:id/estado", habitController.archive);
router.delete("/:id", habitController.archive);
router.put("/:id/registros/:fecha", habitController.progress);
router.post("/:id/subtareas", experience.mutateSubtask);
router.put("/:id/subtareas/:taskId", experience.mutateSubtask);
router.delete("/:id/subtareas/:taskId", experience.mutateSubtask);
router.put(
  "/:id/subtareas/:taskId/registros/:fecha",
  experience.subtaskProgress,
);
router.get("/:id/recordatorio", experience.getReminder);
router.put("/:id/recordatorio", experience.setReminder);
export default router;
