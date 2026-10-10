import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import jwt from "jsonwebtoken";

dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });
for (const name of ["HOST", "PORT", "USER", "PASSWORD"])
  if (process.env[`TEST_DB_${name}`] !== undefined)
    process.env[`DB_${name}`] = process.env[`TEST_DB_${name}`];

test("Habit API with real MariaDB and independent accounts", async (suite) => {
  const database = `habit_system_test_${Date.now()}_${process.pid}`;
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
  });
  let server;
  let pool;
  try {
    await admin.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    process.env.DB_NAME = database;
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    const [{ default: app }, connection, { cookieName, jwtOptions }, calendar] =
      await Promise.all([
        import("../src/app.js"),
        import("../src/config/db.js"),
        import("../src/config/auth.js"),
        import("../src/utils/habitCalendar.js"),
      ]);
    pool = connection.pool;
    const schema = await readFile(
      new URL("../database/schema.sql", import.meta.url),
      "utf8",
    );
    await pool.query(schema.slice(schema.indexOf("CREATE TABLE")));
    const migrationDirectory = new URL(
      "../database/migrations/",
      import.meta.url,
    );
    for (const file of (await readdir(migrationDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      const sql = await readFile(new URL(file, migrationDirectory), "utf8");
      for (const statement of sql
        .split(";")
        .filter((statement) => statement.trim()))
        await pool.query(statement);
    }
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(
      path,
      cookie,
      method = "GET",
      body,
      extraHeaders = {},
    ) {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { response, status: response.status, data: await response.json() };
    }
    async function account(email) {
      const credentials = { email, password: "TestHabits!2026" };
      assert.equal(
        (
          await request("/auth/register", null, "POST", {
            ...credentials,
            nombre: "Prueba",
            apellido: "Aislada",
            confirmar: credentials.password,
          })
        ).status,
        201,
      );
      const login = await request("/auth/login", null, "POST", credentials);
      assert.equal(login.status, 200);
      return {
        cookie: login.response.headers.get("set-cookie").split(";")[0],
        id: login.data.usuario.id,
      };
    }
    const first = await account("first@example.test");
    const second = await account("second@example.test");
    const date = calendar.today();
    const definition = {
      nombre: "Leer",
      descripcion: "20 páginas",
      frecuencia: "diario",
      inicio: calendar.addDays(date, -10),
      objetivo: 20,
      unidad: "páginas",
      dias: [],
      dias_semana: 1,
    };
    let habitId;
    await suite.test(
      "unauthenticated and expired sessions are rejected",
      async () => {
        assert.equal((await request("/habitos")).status, 401);
        const token = jwt.sign({ id: first.id }, process.env.JWT_SECRET, {
          ...jwtOptions,
          expiresIn: -1,
        });
        assert.equal(
          (await request("/habitos", `${cookieName}=${token}`)).status,
          401,
        );
      },
    );
    await suite.test("create persists the owner from the session", async () => {
      const result = await request("/habitos", first.cookie, "POST", {
        ...definition,
        usuario_id: second.id,
      });
      assert.equal(result.status, 201);
      habitId = result.data.habito.id;
      assert.equal(
        (await request("/habitos", second.cookie)).data.habitos.length,
        0,
      );
    });
    await suite.test(
      "another account cannot read, edit, archive or record an owned habit",
      async () => {
        for (const [path, method, body] of [
          [`/${habitId}`, "GET"],
          [`/${habitId}`, "PUT", definition],
          [`/${habitId}`, "DELETE", {}],
          [`/${habitId}/estado`, "PATCH", { archivado: false }],
          [`/${habitId}/registros/${date}`, "PUT", { cantidad: 20 }],
        ]) {
          assert.equal(
            (await request("/habitos" + path, second.cookie, method, body))
              .status,
            404,
          );
        }
      },
    );
    await suite.test(
      "progress supports partial completion, correction and unique daily records",
      async () => {
        assert.equal(
          (
            await request(
              `/habitos/${habitId}/registros/${date}`,
              first.cookie,
              "PUT",
              { cantidad: 10 },
            )
          ).data.habito.hoy.completado,
          false,
        );
        assert.equal(
          (
            await request(
              `/habitos/${habitId}/registros/${date}`,
              first.cookie,
              "PUT",
              { cantidad: 20 },
            )
          ).data.habito.hoy.completado,
          true,
        );
        const [[{ total }]] = await pool.execute(
          "SELECT COUNT(*) total FROM habito_registros WHERE habito_id=? AND fecha=?",
          [habitId, date],
        );
        assert.equal(total, 1);
        assert.equal(
          (
            await request(
              `/habitos/${habitId}/registros/${date}`,
              first.cookie,
              "PUT",
              { cantidad: 0 },
            )
          ).data.habito.hoy.completado,
          false,
        );
      },
    );
    await suite.test("historical corrections and actual streaks", async () => {
      for (const offset of [-2, -1, 0])
        assert.equal(
          (
            await request(
              `/habitos/${habitId}/registros/${calendar.addDays(date, offset)}`,
              first.cookie,
              "PUT",
              { cantidad: 20 },
            )
          ).status,
          200,
        );
      const habit = (await request(`/habitos/${habitId}`, first.cookie)).data
        .habito;
      assert.equal(habit.rachaActual, 3);
      assert.equal(habit.mejorRacha, 3);
    });
    await suite.test(
      "edits preserve the previous target and take effect tomorrow",
      async () => {
        const result = await request(
          `/habitos/${habitId}`,
          first.cookie,
          "PUT",
          { ...definition, objetivo: 60 },
        );
        assert.equal(result.status, 200);
        assert.equal(result.data.habito.hoy.objetivo, 20);
        assert.equal(
          result.data.habito.proximaConfiguracion.objetivo,
          "60.000",
        );
      },
    );
    await suite.test(
      "archive and restoration preserve all history",
      async () => {
        assert.equal(
          (await request(`/habitos/${habitId}`, first.cookie, "DELETE", {}))
            .data.habito.proximaConfiguracion.archivado,
          1,
        );
        const restored = await request(
          `/habitos/${habitId}/estado`,
          first.cookie,
          "PATCH",
          { archivado: false },
        );
        assert.equal(restored.data.habito.proximaConfiguracion.archivado, 0);
        assert.equal(
          restored.data.habito.proximaConfiguracion.objetivo,
          "60.000",
        );
        assert.equal(restored.data.habito.registros.length, 3);
      },
    );
    await suite.test(
      "summary, statistics and monthly calendar use real records",
      async () => {
        const summary = (await request("/habitos/resumen", first.cookie)).data;
        assert.equal(summary.estadisticas.completados, 1);
        assert.equal(summary.estadisticas.porcentaje, 100);
        const statistics = (
          await request("/habitos/estadisticas", first.cookie)
        ).data;
        assert.equal(statistics.evolucion.length, 30);
        assert.equal(statistics.porHabito[0].rachaActual, 3);
        const calendar = (
          await request(
            `/habitos/historial?mes=${date.slice(0, 7)}`,
            first.cookie,
          )
        ).data;
        assert.equal(
          calendar.dias.find((day) => day.fecha === date).estado,
          "completo",
        );
      },
    );
    await suite.test(
      "weekly and specific-day habits enforce scheduling",
      async () => {
        const weekly = await request("/habitos", first.cookie, "POST", {
          ...definition,
          nombre: "Ejercicio",
          frecuencia: "semanal",
          objetivo: 1,
          dias_semana: 3,
          inicio: calendar.monday(date),
        });
        assert.equal(weekly.status, 201);
        assert.equal(weekly.data.habito.porcentaje, null);
        const days = await request("/habitos", first.cookie, "POST", {
          ...definition,
          frecuencia: "dias",
          dias: [calendar.weekday(calendar.addDays(date, 1))],
        });
        assert.equal(
          (
            await request(
              `/habitos/${days.data.habito.id}/registros/${date}`,
              first.cookie,
              "PUT",
              { cantidad: 20 },
            )
          ).status,
          400,
        );
      },
    );
    await suite.test(
      "invalid values, future dates, non-JSON writes and CSRF origins are rejected",
      async () => {
        assert.equal(
          (
            await request(
              `/habitos/${habitId}/registros/${calendar.addDays(date, 1)}`,
              first.cookie,
              "PUT",
              { cantidad: 20 },
            )
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/habitos/${habitId}/registros/2026-02-30`,
              first.cookie,
              "PUT",
              { cantidad: 20 },
            )
          ).status,
          400,
        );
        assert.equal(
          (await request("/habitos/1%20OR%201", first.cookie)).status,
          400,
        );
        assert.equal(
          (
            await request("/habitos", first.cookie, "POST", {
              ...definition,
              objetivo: -1,
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(
              `/habitos/${habitId}`,
              first.cookie,
              "PUT",
              definition,
              { Origin: "https://evil.example" },
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await request(
              `/habitos/${habitId}/estado`,
              first.cookie,
              "PATCH",
              { archivado: true },
              { "Content-Type": "text/plain" },
            )
          ).status,
          415,
        );
      },
    );
    await suite.test(
      "monthly calendar includes weekly records outside the month boundary",
      async () => {
        const monthStart = date.slice(0, 7) + "-01";
        const weekStart = calendar.monday(monthStart);
        const created = await request("/habitos", first.cookie, "POST", {
          ...definition,
          frecuencia: "semanal",
          inicio: weekStart,
          dias_semana: 1,
          objetivo: 1,
        });
        await request(
          `/habitos/${created.data.habito.id}/registros/${weekStart}`,
          first.cookie,
          "PUT",
          { cantidad: 1 },
        );
        const history = (
          await request(
            `/habitos/historial?mes=${date.slice(0, 7)}`,
            first.cookie,
          )
        ).data;
        const day = history.dias.find((day) => day.fecha === monthStart);
        assert.equal(
          day.habitos.find((habit) => habit.id === created.data.habito.id)
            .periodoSemanal.realizado,
          1,
        );
      },
    );
    await suite.test(
      "logout revokes access to private habit endpoints",
      async () => {
        assert.equal(
          (await request("/auth/logout", first.cookie, "POST", {})).status,
          200,
        );
        assert.equal((await request("/habitos", first.cookie)).status, 401);
      },
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    await admin.end();
    console.log(`Base de pruebas conservada, sin DROP: ${database}`);
  }
});
