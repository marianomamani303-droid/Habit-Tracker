import { pool } from "../src/config/db.js";
import { applyMigrations } from "../src/config/migrations.js";

try {
  for (const file of await applyMigrations(pool)) {
    console.log(`Migración preparada: ${file}`);
  }
  console.log(
    "Migraciones preparadas. Los usuarios y registros existentes se conservan.",
  );
} catch (error) {
  console.error("No se pudo aplicar la migración:", error.code ?? error.name);
  process.exitCode = 1;
} finally {
  await pool.end();
}
