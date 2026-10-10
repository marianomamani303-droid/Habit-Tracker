import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import test from "node:test";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import { applyMigrations } from "../src/config/migrations.js";

dotenv.config({ path: new URL("../.env", import.meta.url), quiet: true });

test("Autenticación HTTP con bcrypt, JWT y MySQL reales", async (t) => {
  for (const name of ["HOST", "PORT", "USER", "PASSWORD"]) {
    if (process.env[`TEST_DB_${name}`] !== undefined) {
      process.env[`DB_${name}`] = process.env[`TEST_DB_${name}`];
    }
  }
  // Crea y elimina exclusivamente una base nueva de pruebas, nunca DB_NAME.
  const testDatabase = `habit_tracker_test_${Date.now()}_${process.pid}`;
  assert.match(testDatabase, /^habit_tracker_test_\d+_\d+$/);
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
    connectTimeout: 5000,
  });

  let created = false;
  let server;
  let pool;
  try {
    await admin.query(
      `CREATE DATABASE \`${testDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    created = true;
    process.env.DB_NAME = testDatabase;
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = randomBytes(48).toString("hex");
    process.env.FRONTEND_URL = "http://localhost:5173";
    process.env.COOKIE_SAME_SITE = "lax";

    const [{ default: app }, db, { cookieName, jwtOptions }] =
      await Promise.all([
        import("../src/app.js"),
        import("../src/config/db.js"),
        import("../src/config/auth.js"),
      ]);
    pool = db.pool;
    const schema = await readFile(
      new URL("../database/schema.sql", import.meta.url),
      "utf8",
    );
    await pool.query(schema.slice(schema.indexOf("CREATE TABLE")));
    const migration = await readFile(
      new URL(
        "../database/migrations/001_session_revocations.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await pool.query(migration);
    await pool.query(migration); // La migración puede aplicarse más de una vez.
    await applyMigrations(pool);
    await applyMigrations(pool);

    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;

    async function request(
      path,
      { body, cookie, origin, rawBody, contentType } = {},
    ) {
      const hasBody = body !== undefined || rawBody !== undefined;
      const response = await fetch(`${baseUrl}${path}`, {
        method: hasBody ? "POST" : "GET",
        headers: {
          ...(hasBody
            ? { "Content-Type": contentType ?? "application/json" }
            : {}),
          ...(cookie ? { Cookie: cookie } : {}),
          ...(origin ? { Origin: origin } : {}),
        },
        body: rawBody ?? (hasBody ? JSON.stringify(body) : undefined),
      });
      return { response, data: await response.json() };
    }

    const datos = {
      nombre: " María ",
      apellido: "O'Connor",
      email: " MARIA@EXAMPLE.COM ",
      password: "UnHabitoCadaDia!",
      confirmar: "UnHabitoCadaDia!",
    };
    let usuario;
    let sessionCookie;
    let secondSessionCookie;

    await t.test("registro 201, hash bcrypt y respuesta pública", async () => {
      const { response, data } = await request("/register", { body: datos });
      assert.equal(response.status, 201);
      usuario = data.usuario;
      assert.equal(usuario.nombre, "María");
      assert.equal(usuario.email, "maria@example.com");
      assert.deepEqual(Object.keys(usuario).sort(), [
        "apellido",
        "bio",
        "email",
        "id",
        "nombre",
        "sesion_version",
        "tiene_avatar",
        "zona_horaria",
      ]);
      assert.equal(response.headers.get("set-cookie"), null);
      const [rows] = await pool.execute("SELECT * FROM usuarios WHERE id = ?", [
        usuario.id,
      ]);
      assert.notEqual(rows[0].password_hash, datos.password);
      assert.match(rows[0].password_hash, /^\$2[aby]\$12\$/);
      assert.equal(
        await bcrypt.compare(datos.password, rows[0].password_hash),
        true,
      );
      assert.equal(rows[0].apellido, "O'Connor");
      assert.ok(rows[0].fecha_creacion);
    });

    await t.test("email duplicado devuelve 409", async () => {
      const { response } = await request("/register", { body: datos });
      assert.equal(response.status, 409);
    });

    await t.test(
      "campos vacíos, tipos incorrectos y contraseñas inválidas",
      async () => {
        const casos = [
          {},
          [],
          { ...datos, nombre: "   " },
          { ...datos, apellido: 3 },
          { ...datos, email: "sin-arroba" },
          { ...datos, password: "corta", confirmar: "corta" },
          { ...datos, confirmar: "diferente" },
          { ...datos, password: "🌱".repeat(19), confirmar: "🌱".repeat(19) },
        ];
        for (const body of casos) {
          const { response, data } = await request("/register", { body });
          assert.equal(response.status, 400);
          assert.equal(typeof data.mensaje, "string");
          assert.equal("stack" in data, false);
        }
      },
    );

    await t.test("UNIQUE protege registros concurrentes", async () => {
      const body = { ...datos, email: "concurrente@example.com" };
      const results = await Promise.all([
        request("/register", { body }),
        request("/register", { body }),
      ]);
      assert.deepEqual(
        results.map((result) => result.response.status).sort(),
        [201, 409],
      );
    });

    await t.test(
      "contraseña incorrecta y usuario inexistente: mismo mensaje 401",
      async () => {
        for (const body of [
          { email: datos.email, password: "incorrecta" },
          { email: "ausente@example.com", password: datos.password },
        ]) {
          const { response, data } = await request("/login", { body });
          assert.equal(response.status, 401);
          assert.equal(data.mensaje, "Email o contraseña incorrectos.");
          assert.equal(response.headers.get("set-cookie"), null);
        }
      },
    );

    await t.test(
      "login devuelve cookie HttpOnly con JWT firmado y expiración",
      async () => {
        const { response, data } = await request("/login", {
          body: { email: datos.email, password: datos.password },
          origin: process.env.FRONTEND_URL,
        });
        assert.equal(response.status, 200);
        assert.equal(
          response.headers.get("access-control-allow-origin"),
          process.env.FRONTEND_URL,
        );
        assert.equal(
          response.headers.get("access-control-allow-credentials"),
          "true",
        );
        const cookie = response.headers.get("set-cookie");
        assert.match(cookie, /HttpOnly/);
        assert.match(cookie, /SameSite=Lax/);
        assert.match(cookie, /Path=\/api/);
        assert.doesNotMatch(cookie, /; Secure/);
        sessionCookie = cookie.split(";")[0];
        const token = sessionCookie.slice(`${cookieName}=`.length);
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ["HS256"],
          issuer: jwtOptions.issuer,
          audience: jwtOptions.audience,
        });
        assert.equal(payload.id, usuario.id);
        assert.equal(
          payload.exp - payload.iat,
          Number(process.env.JWT_EXPIRES_SECONDS ?? 86400),
        );
        assert.deepEqual(Object.keys(payload).sort(), [
          "aud",
          "exp",
          "iat",
          "id",
          "iss",
          "jti",
          "sv",
        ]);
        assert.equal("token" in data, false);
        assert.equal("password_hash" in data.usuario, false);
      },
    );

    await t.test(
      "/me usa el JWT e ignora un id enviado por el cliente",
      async () => {
        const { response, data } = await request("/me?idUsuario=999999", {
          cookie: sessionCookie,
        });
        assert.equal(response.status, 200);
        assert.deepEqual(data.usuario, usuario);
        assert.ok(data.expiresInMs > 0);
        assert.ok(
          data.expiresInMs <=
            Number(process.env.JWT_EXPIRES_SECONDS ?? 86400) * 1000,
        );
        assert.equal(response.headers.get("cache-control"), "no-store");
      },
    );

    await t.test(
      "sin cookie, firma inválida, expirado y algoritmo distinto: 401",
      async () => {
        const invalid = jwt.sign(
          { id: usuario.id },
          randomBytes(48).toString("hex"),
          jwtOptions,
        );
        const expired = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
          ...jwtOptions,
          expiresIn: -1,
        });
        const wrongAlgorithm = jwt.sign(
          { id: usuario.id },
          process.env.JWT_SECRET,
          { ...jwtOptions, algorithm: "HS384" },
        );
        const noExpiry = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
          issuer: jwtOptions.issuer,
          audience: jwtOptions.audience,
        });
        for (const cookie of [
          undefined,
          `${cookieName}=roto`,
          ...[invalid, expired, wrongAlgorithm, noExpiry].map(
            (token) => `${cookieName}=${token}`,
          ),
        ]) {
          const { response } = await request("/me", { cookie });
          assert.equal(response.status, 401);
        }
      },
    );

    await t.test(
      "dos usuarios solo pueden consultar su propio perfil",
      async () => {
        const second = { ...datos, nombre: "Otra", email: "otra@example.com" };
        const registered = await request("/register", { body: second });
        assert.equal(registered.response.status, 201);
        const signedIn = await request("/login", {
          body: { email: second.email, password: second.password },
        });
        assert.equal(signedIn.response.status, 200);
        const secondCookie = signedIn.response.headers
          .get("set-cookie")
          .split(";")[0];
        secondSessionCookie = secondCookie;
        const profile = await request(`/me?id=${usuario.id}`, {
          cookie: secondCookie,
        });
        assert.deepEqual(profile.data.usuario, registered.data.usuario);
        assert.notEqual(profile.data.usuario.id, usuario.id);
        assert.deepEqual(
          (
            await request(`/me?id=${registered.data.usuario.id}`, {
              cookie: sessionCookie,
            })
          ).data.usuario,
          usuario,
        );
        const firstToken = sessionCookie.slice(`${cookieName}=`.length);
        const secondToken = secondCookie.slice(`${cookieName}=`.length);
        assert.notEqual(
          jwt.decode(firstToken).jti,
          jwt.decode(secondToken).jti,
        );
      },
    );

    await t.test("origen ajeno y formulario simple se rechazan", async () => {
      const external = await request("/logout", {
        body: {},
        cookie: sessionCookie,
        origin: "https://ajeno.example",
      });
      assert.equal(external.response.status, 403);
      const form = await request("/logout", {
        rawBody: "x=1",
        contentType: "application/x-www-form-urlencoded",
        cookie: sessionCookie,
      });
      assert.equal(form.response.status, 415);
      const preflight = await fetch(`${baseUrl}/login`, {
        method: "OPTIONS",
        headers: {
          Origin: process.env.FRONTEND_URL,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type",
        },
      });
      assert.equal(preflight.status, 204);
      assert.equal(
        preflight.headers.get("access-control-allow-credentials"),
        "true",
      );
    });

    await t.test(
      "JSON malformado, cuerpo enorme y ruta inexistente",
      async () => {
        assert.equal(
          (await request("/login", { rawBody: "{" })).response.status,
          400,
        );
        assert.equal(
          (await request("/login", { body: { relleno: "x".repeat(11000) } }))
            .response.status,
          413,
        );
        assert.equal((await request("/no-existe")).response.status, 404);
      },
    );

    await t.test(
      "logout revoca el token en MySQL, elimina la cookie y bloquea reutilización",
      async () => {
        const { response } = await request("/logout", {
          body: {},
          cookie: sessionCookie,
        });
        assert.equal(response.status, 200);
        const cleared = response.headers.get("set-cookie");
        assert.match(cleared, new RegExp(`^${cookieName}=;`));
        assert.match(cleared, /Expires=Thu, 01 Jan 1970/);
        assert.match(cleared, /Path=\/api/);
        assert.equal(
          (await request("/me", { cookie: sessionCookie })).response.status,
          401,
        );
        assert.equal(
          (await request("/logout", { body: {}, cookie: sessionCookie }))
            .response.status,
          200,
        );
        const [revocations] = await pool.query(
          "SELECT * FROM sesiones_revocadas",
        );
        assert.equal(revocations.length, 1);
        assert.match(revocations[0].token_hash, /^[a-f0-9]{64}$/);
        assert.ok(revocations[0].expira_en);
        assert.equal(
          (await request("/me", { cookie: secondSessionCookie })).response
            .status,
          200,
        );
        // Aplicamos la eliminación igual que haría el navegador.
        sessionCookie = undefined;
        assert.equal(
          (await request("/me", { cookie: sessionCookie })).response.status,
          401,
        );
      },
    );

    await t.test("usuario eliminado: /me rechaza su JWT", async () => {
      await pool.execute("DELETE FROM usuarios WHERE id = ?", [usuario.id]);
      const token = jwt.sign(
        { id: usuario.id },
        process.env.JWT_SECRET,
        jwtOptions,
      );
      assert.equal(
        (await request("/me", { cookie: `${cookieName}=${token}` })).response
          .status,
        401,
      );
    });

    await t.test("limitador responde 429 y Retry-After", async () => {
      let last;
      for (let index = 0; index < 21; index++) {
        last = await request("/login", { body: {} });
      }
      assert.equal(last.response.status, 429);
      assert.ok(last.response.headers.get("retry-after"));
    });

    await t.test(
      "logout no confirma un cierre si falla la persistencia",
      async () => {
        const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, jwtOptions);
        await pool.query(
          "RENAME TABLE sesiones_revocadas TO sesiones_revocadas_temporal",
        );
        try {
          const { response, data } = await request("/logout", {
            body: {},
            cookie: `${cookieName}=${token}`,
          });
          assert.equal(response.status, 500);
          assert.equal(response.headers.get("set-cookie"), null);
          assert.deepEqual(data, {
            mensaje: "Ocurrió un error interno. Inténtalo más tarde.",
          });
        } finally {
          await pool.query(
            "RENAME TABLE sesiones_revocadas_temporal TO sesiones_revocadas",
          );
        }
      },
    );

    await t.test("errores MySQL no exponen SQL, hash ni stack", async () => {
      const originalExecute = pool.execute.bind(pool);
      pool.execute = async () => {
        throw Object.assign(new Error("Database unavailable"), {
          code: "ER_TEST_FAILURE",
        });
      };
      const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET, jwtOptions);
      const { response, data } = await request("/me", {
        cookie: `${cookieName}=${token}`,
      });
      assert.equal(response.status, 500);
      assert.deepEqual(data, {
        mensaje: "Ocurrió un error interno. Inténtalo más tarde.",
      });
      pool.execute = originalExecute;
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (pool) await pool.end();
    if (created) console.log(`Base aislada conservada: ${testDatabase}`);
    await admin.end();
  }
});
