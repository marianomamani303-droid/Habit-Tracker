import { readFile, readdir } from "node:fs/promises";

// Migrations are additive and idempotent; SQL files contain standalone statements.
export async function applyMigrations(connection) {
  const directory = new URL("../../database/migrations/", import.meta.url);
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const migration = await readFile(new URL(file, directory), "utf8");
    const statements = migration
      .split(";")
      .filter((statement) => statement.trim());
    for (const statement of statements) await connection.query(statement);
  }
  return files;
}
