import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import habitRoutes from "./routes/habitRoutes.js";
import experienceRoutes from "./routes/experienceRoutes.js";
import { HttpError } from "./utils/HttpError.js";

const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "no-referrer");
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === config.frontendUrl) {
        return callback(null, true);
      }
      callback(new HttpError(403, "Origen no permitido."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
// Only the authenticated avatar route accepts larger JSON; other forms retain 10 KB.
app.use("/api/perfil/avatar", express.json({ limit: "3mb" }));
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());
app.use("/api/auth", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use("/api/auth", authRoutes);
app.use("/api/habitos", habitRoutes);
app.use("/api", experienceRoutes);
app.use((_req, _res, next) => {
  next(new HttpError(404, "Ruta no encontrada."));
});
// Express 5 envía automáticamente los rechazos de controllers async aquí.
app.use(errorHandler);

export default app;
