import app from "./src/app.js";
import { pool } from "./src/config/db.js";
import { config } from "./src/config/env.js";

try {
  await pool.execute("SELECT 1");
  await pool.execute("SELECT token_hash FROM sesiones_revocadas LIMIT 0");
  await pool.execute("SELECT id FROM habitos LIMIT 0");
  await pool.execute("SELECT id FROM habito_versiones LIMIT 0");
  await pool.execute("SELECT fecha FROM habito_registros LIMIT 0");
  for (const table of ['usuario_perfiles','password_recuperaciones','habito_reglas','habito_subtareas','subtarea_registros','usuario_logros','habito_recordatorios','usuario_notificaciones'])
    await pool.query(`SELECT 1 FROM ${table} LIMIT 0`);
  const server = app.listen(config.port, (error) => {
    if (!error)
      console.log(`API Habit Tracker disponible en el puerto ${config.port}.`);
  });

  server.on("error", async (error) => {
    console.error("No se pudo iniciar el servidor:", error.code);
    if (error.code === "EADDRINUSE")
      console.error(
        `El puerto ${config.port} ya está ocupado. Comprobá si la API ya está iniciada.`,
      );
    await pool.end();
    process.exitCode = 1;
  });

  function shutdown() {
    server.close(async () => {
      await pool.end();
      process.exitCode = 0;
    });
  }
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
} catch (error) {
  console.error("No se pudo conectar con MySQL:", error.code ?? "Error");
  console.error(
    "Revisa DB_* en .env, inicia MySQL, ejecuta database/schema.sql y npm run db:migrate.",
  );
  await pool.end();
  process.exitCode = 1;
}
