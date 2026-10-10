import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { applyMigrations } from "../src/config/migrations.js";

dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });
test("additive migration can run twice without changing pre-existing rows", async () => {
  const database = `habitly_migration_test_${Date.now()}_${process.pid}`;
  const connection = await mysql.createConnection({
    host: process.env.TEST_DB_HOST ?? process.env.DB_HOST,
    port: Number(process.env.TEST_DB_PORT ?? process.env.DB_PORT),
    user: process.env.TEST_DB_USER ?? process.env.DB_USER,
    password: process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "",
  });
  try {
    await connection.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`,
    );
    await connection.query(`USE \`${database}\``);
    const schema = await readFile(
      new URL("../database/schema.sql", import.meta.url),
      "utf8",
    );
    await connection.query(schema.slice(schema.indexOf("CREATE TABLE")));
    const legacyMigration = await readFile(
      new URL("../database/migrations/002_habits.sql", import.meta.url),
      "utf8",
    );
    for (const statement of legacyMigration.split(";").filter((s) => s.trim()))
      await connection.query(statement);
    await connection.execute(
      "INSERT INTO usuarios (nombre,apellido,email,password_hash) VALUES (?,?,?,?)",
      ["Anterior", "Preservado", "legacy@example.test", "fixture-hash"],
    );
    await connection.execute(
      "INSERT INTO habitos (usuario_id,nombre,descripcion) VALUES (1,?,?)",
      ["Lectura anterior", "Mantener datos"],
    );
    await connection.execute(
      `INSERT INTO habito_versiones (habito_id,desde,inicio,frecuencia,objetivo) VALUES (1,'2026-01-01','2026-01-01','diario',20)`,
    );
    await connection.execute(
      `INSERT INTO habito_registros (habito_id,fecha,cantidad) VALUES (1,'2026-01-02',20)`,
    );
    async function snapshot() {
      const result = {};
      for (const table of [
        "usuarios",
        "habitos",
        "habito_versiones",
        "habito_registros",
      ])
        result[table] = (await connection.query(`SELECT * FROM ${table}`))[0];
      return result;
    }
    const before = await snapshot();
    await applyMigrations(connection);
    await applyMigrations(connection);
    assert.deepEqual(await snapshot(), before);
    const [tables] = await connection.query("SHOW TABLES");
    assert.equal(tables.length, 13);
    console.log(`Migración verificada en base aislada conservada: ${database}`);
  } finally {
    await connection.end();
  }
});
