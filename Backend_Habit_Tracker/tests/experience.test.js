import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import sharp from "sharp";
import { applyMigrations } from "../src/config/migrations.js";

dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });
for (const name of ["HOST", "PORT", "USER", "PASSWORD"])
  if (process.env[`TEST_DB_${name}`] !== undefined)
    process.env[`DB_${name}`] = process.env[`TEST_DB_${name}`];

test("Habitly experience endpoints with real isolated MySQL", async (suite) => {
  const database = `habitly_experience_test_${Date.now()}_${process.pid}`;
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
  });
  let server, pool;
  try {
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
    process.env.DB_NAME = database;
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    process.env.FRONTEND_URL = "http://localhost:5173";
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_FROM;
    const [{ default: app }, db, calendar] = await Promise.all([
      import("../src/app.js"),
      import("../src/config/db.js"),
      import("../src/utils/habitCalendar.js"),
    ]);
    pool = db.pool;
    const schema = await readFile(
      new URL("../database/schema.sql", import.meta.url),
      "utf8",
    );
    await pool.query(schema.slice(schema.indexOf("CREATE TABLE")));
    await applyMigrations(pool);
    await applyMigrations(pool);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}/api`;
    async function request(path, cookie, method = "GET", body) {
      const response = await fetch(base + path, {
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { response, status: response.status, data: await response.json() };
    }
    const credentials = {
      nombre: "María",
      apellido: "Prueba",
      email: "owner@example.test",
      password: "HabitlyTest!2026",
      confirmar: "HabitlyTest!2026",
    };
    async function login(
      email = credentials.email,
      password = credentials.password,
    ) {
      const result = await request("/auth/login", null, "POST", {
        email,
        password,
      });
      assert.equal(result.status, 200);
      return result.response.headers.get("set-cookie").split(";")[0];
    }
    const owner = (await request("/auth/register", null, "POST", credentials))
      .data.usuario;
    let cookie = await login();
    await request("/auth/register", null, "POST", {
      ...credentials,
      email: "other@example.test",
    });
    const other = await login("other@example.test");
    const date = calendar.today();
    const definition = {
      nombre: "Ritual de lectura",
      inicio: date,
      frecuencia: "diario",
      objetivo: 1,
      dias: [],
    };
    const habit = (await request("/habitos", cookie, "POST", definition)).data
      .habito;
    let taskId;
    await suite.test(
      "private endpoints and JSON writes are enforced",
      async () => {
        for (const path of ["/perfil", "/logros", "/notificaciones"])
          assert.equal((await request(path)).status, 401);
        const response = await fetch(base + "/perfil", {
          method: "PUT",
          headers: { Cookie: cookie, "Content-Type": "text/plain" },
          body: "{}",
        });
        assert.equal(response.status, 415);
        const foreign = await fetch(base + "/perfil", {
          method: "PUT",
          headers: {
            Cookie: cookie,
            Origin: "https://evil.test",
            "Content-Type": "application/json",
          },
          body: "{}",
        });
        assert.equal(foreign.status, 403);
      },
    );
    await suite.test(
      "subtask creation, rename, isolated ownership and atomic daily completion",
      async () => {
        const created = await request(
          `/habitos/${habit.id}/subtareas`,
          cookie,
          "POST",
          { nombre: "Leer un capítulo" },
        );
        assert.equal(created.status, 201);
        taskId = created.data.id;
        assert.equal(
          (
            await request(`/habitos/${habit.id}/subtareas`, other, "POST", {
              nombre: "Ajena",
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await request(
              `/habitos/${habit.id}/subtareas/${taskId}`,
              other,
              "PUT",
              { nombre: "Ajena" },
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await request(
              `/habitos/${habit.id}/subtareas/${taskId}/registros/${date}`,
              other,
              "PUT",
              { completado: true },
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await request(
              `/habitos/${habit.id}/subtareas/${taskId}`,
              cookie,
              "PUT",
              { nombre: "Leer y pensar" },
            )
          ).status,
          200,
        );
        await Promise.all(
          Array.from({ length: 4 }, () =>
            request(
              `/habitos/${habit.id}/subtareas/${taskId}/registros/${date}`,
              cookie,
              "PUT",
              { completado: true },
            ),
          ),
        );
        const state = (await request(`/habitos/${habit.id}`, cookie)).data
          .habito;
        assert.equal(state.hoy.completado, true);
        assert.equal(state.hoy.progreso, 100);
        const [[counts]] = await pool.query(
          "SELECT (SELECT COUNT(*) FROM habito_registros) habits,(SELECT COUNT(*) FROM subtarea_registros) tasks",
        );
        assert.deepEqual({ ...counts }, { habits: 1, tasks: 1 });
        const partial = await request(
          `/habitos/${habit.id}/registros/${date}`,
          cookie,
          "PUT",
          { cantidad: 0.5 },
        );
        assert.equal(partial.status, 400);
        const reset = await request(
          `/habitos/${habit.id}/registros/${date}`,
          cookie,
          "PUT",
          { cantidad: 0 },
        );
        assert.equal(reset.data.habito.hoy.subtareas[0].completado, false);
        await request(`/habitos/${habit.id}/registros/${date}`, cookie, "PUT", {
          cantidad: 1,
        });
      },
    );
    await suite.test(
      "medals unlock once and are isolated and permanent",
      async () => {
        for (let i = 0; i < 3; i++) await request("/logros", cookie);
        const [[counts]] = await pool.query(
          "SELECT COUNT(*) total FROM usuario_logros WHERE usuario_id=?",
          [owner.id],
        );
        assert.equal(counts.total, 1);
        assert.equal(
          (await request("/logros", other)).data.logros.some(
            (m) => m.desbloqueado_en,
          ),
          false,
        );
        await request("/logros/vistos", cookie, "POST", {});
        assert.equal(
          (await request("/logros", cookie)).data.logros[0].nuevo,
          false,
        );
        await request(`/habitos/${habit.id}/registros/${date}`, cookie, "PUT", {
          cantidad: 0,
        });
        assert.ok(
          (await request("/logros", cookie)).data.logros[0].desbloqueado_en,
        );
      },
    );
    await suite.test(
      "profile persistence, timezone validation and untrusted user IDs",
      async () => {
        const body = {
          nombre: "María editada",
          apellido: "Prueba",
          bio: "Mi rutina",
          zona_horaria: "UTC",
          usuario_id: 99999,
        };
        assert.equal(
          (await request("/perfil", cookie, "PUT", body)).data.usuario.nombre,
          "María editada",
        );
        assert.equal(
          (await request("/perfil", cookie)).data.usuario.zona_horaria,
          "UTC",
        );
        assert.equal(
          (await request("/perfil", other)).data.usuario.nombre,
          "María",
        );
        assert.equal(
          (
            await request("/perfil", cookie, "PUT", {
              ...body,
              zona_horaria: "invalid/zone",
            })
          ).status,
          400,
        );
        await request("/perfil", cookie, "PUT", {
          ...body,
          zona_horaria: calendar.TIME_ZONE,
        });
      },
    );
    await suite.test(
      "reminders use server time, remain unique and retain read state",
      async () => {
        assert.equal(
          (
            await request(`/habitos/${habit.id}/recordatorio`, other, "PUT", {
              hora: "00:00",
              activo: true,
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await request(`/habitos/${habit.id}/recordatorio`, cookie, "PUT", {
              hora: "25:00",
              activo: true,
            })
          ).status,
          400,
        );
        await request(`/habitos/${habit.id}/recordatorio`, cookie, "PUT", {
          hora: "00:00",
          activo: true,
        });
        const results = await Promise.all(
          Array.from({ length: 3 }, () => request("/notificaciones", cookie)),
        );
        const reminder = results[0].data.notificaciones[0];
        assert.ok(reminder);
        assert.equal(results[0].data.pendientes, 1);
        assert.equal(
          (await request(`/notificaciones/${reminder.id}`, other, "PATCH", {}))
            .status,
          404,
        );
        await request(`/notificaciones/${reminder.id}`, cookie, "PATCH", {});
        assert.equal(
          (await request("/notificaciones", cookie)).data.pendientes,
          0,
        );
        const [[count]] = await pool.query(
          "SELECT COUNT(*) total FROM usuario_notificaciones",
        );
        assert.equal(count.total, 1);
      },
    );
    await suite.test(
      "avatar content decoded, normalized and privately served",
      async () => {
        const buffer = await sharp({
          create: { width: 40, height: 40, channels: 3, background: "#123456" },
        })
          .png()
          .toBuffer();
        assert.equal(
          (
            await request("/perfil/avatar", cookie, "PUT", {
              tipo: "image/png",
              imagen: buffer.toString("base64"),
            })
          ).status,
          200,
        );
        const response = await fetch(base + "/perfil/avatar", {
          headers: { Cookie: cookie },
        });
        assert.equal(response.headers.get("content-type"), "image/webp");
        const metadata = await sharp(
          Buffer.from(await response.arrayBuffer()),
        ).metadata();
        assert.equal(metadata.width, 256);
        assert.equal(
          (await fetch(base + "/perfil/avatar", { headers: { Cookie: other } }))
            .status,
          404,
        );
        for (const body of [
          {
            tipo: "image/png",
            imagen: Buffer.from("<script/>").toString("base64"),
          },
          { tipo: "image/jpeg", imagen: buffer.toString("base64") },
          { tipo: "image/svg+xml", imagen: buffer.toString("base64") },
        ])
          assert.equal(
            (await request("/perfil/avatar", cookie, "PUT", body)).status,
            400,
          );
      },
    );
    await suite.test(
      "weekly monthly and annual statistics return real persisted records",
      async () => {
        await request(`/habitos/${habit.id}/registros/${date}`, cookie, "PUT", {
          cantidad: 1,
        });
        for (const period of ["semana", "mes", "ano"]) {
          const result = await request(
            `/habitos/estadisticas?periodo=${period}&fecha=${date}`,
            cookie,
          );
          assert.equal(result.status, 200);
          assert.equal(result.data.resumenPeriodo.completados, 1);
          assert.equal(result.data.resumenPeriodo.porcentaje, 100);
        }
        assert.equal(
          (await request("/habitos/estadisticas?periodo=ano", cookie)).data
            .serie.length,
          12,
        );
      },
    );
    await suite.test(
      "subtask removal keeps current and historical records",
      async () => {
        const response = await request(
          `/habitos/${habit.id}/subtareas/${taskId}`,
          cookie,
          "DELETE",
          {},
        );
        assert.equal(response.status, 200);
        assert.equal(response.data.hasta, calendar.addDays(date, 1));
        const [[count]] = await pool.query(
          "SELECT COUNT(*) total FROM subtarea_registros",
        );
        assert.equal(count.total, 1);
      },
    );
    await suite.test(
      "SMTP missing is honestly unavailable and independent of registration",
      async () => {
        const registered = await request("/auth/recuperar", null, "POST", {
          email: credentials.email,
        });
        const unknown = await request("/auth/recuperar", null, "POST", {
          email: "unknown@example.test",
        });
        assert.equal(registered.status, 503);
        assert.deepEqual(registered.data, unknown.data);
      },
    );
    await suite.test(
      "password verifies current value and invalidates every copied session",
      async () => {
        assert.equal(
          (
            await request("/perfil/password", cookie, "POST", {
              actual: "bad",
              password: "NewHabitly!2026",
              confirmar: "NewHabitly!2026",
            })
          ).status,
          400,
        );
        const copied = cookie;
        assert.equal(
          (
            await request("/perfil/password", cookie, "POST", {
              actual: credentials.password,
              password: "NewHabitly!2026",
              confirmar: "NewHabitly!2026",
            })
          ).status,
          200,
        );
        assert.equal((await request("/perfil", copied)).status, 401);
        cookie = await login(credentials.email, "NewHabitly!2026");
      },
    );
    await suite.test(
      "reset tokens expire, are hashed and single-use even with concurrent requests",
      async () => {
        async function seed(expired) {
          const token = randomBytes(32).toString("hex");
          const digest = createHash("sha256").update(token).digest("hex");
          await pool.execute(
            "INSERT INTO password_recuperaciones (token_hash,usuario_id,expira_en) VALUES (?,?,?)",
            [
              digest,
              owner.id,
              new Date(Date.now() + (expired ? -60000 : 60000)),
            ],
          );
          return token;
        }
        const expired = await seed(true);
        assert.equal(
          (
            await request("/auth/restablecer", null, "POST", {
              token: expired,
              password: "ResetHabitly!2026",
              confirmar: "ResetHabitly!2026",
            })
          ).status,
          400,
        );
        const token = await seed(false);
        const body = {
          token,
          password: "ResetHabitly!2026",
          confirmar: "ResetHabitly!2026",
        };
        const results = await Promise.all([
          request("/auth/restablecer", null, "POST", body),
          request("/auth/restablecer", null, "POST", body),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
        assert.equal((await request("/perfil", cookie)).status, 401);
        assert.equal(
          (await request("/auth/restablecer", null, "POST", body)).status,
          400,
        );
        cookie = await login(credentials.email, "ResetHabitly!2026");
        assert.equal((await request("/perfil", cookie)).status, 200);
      },
    );
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    await admin.end();
    console.log(`Base aislada conservada: ${database}`);
  }
});
