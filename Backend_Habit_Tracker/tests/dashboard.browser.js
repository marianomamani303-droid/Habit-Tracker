// Prueba de integración opcional. Playwright se instala en una carpeta temporal
// y se carga con NODE_PATH, sin agregar dependencias a la aplicación.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import { applyMigrations } from "../src/config/migrations.js";
import { runHabitBrowserFlow } from "./helpers/habitBrowserFlow.js";
import { runExperienceBrowserFlow } from "./helpers/experienceBrowserFlow.js";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const frontendRoot = fileURLToPath(
  new URL(
    "../../Frontend_Habit_Tracker/frontend habit tracker/",
    import.meta.url,
  ),
);
dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });
const database = `habit_tracker_test_browser_${Date.now()}_${process.pid}`;
assert.match(database, /^habit_tracker_test_browser_\d+_\d+$/);
const frontendPort = process.env.TEST_FRONTEND_PORT ?? "5175";
const backendPort = process.env.TEST_BACKEND_PORT ?? "3002";
const frontendUrl = `http://localhost:${frontendPort}`;
const apiUrl = `http://localhost:${backendPort}/api`;
const secret = randomBytes(48).toString("hex");
const connectionOptions = {
  host: process.env.TEST_DB_HOST ?? process.env.DB_HOST,
  port: Number(process.env.TEST_DB_PORT ?? process.env.DB_PORT ?? 3306),
  user: process.env.TEST_DB_USER ?? process.env.DB_USER,
  password: process.env.TEST_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "",
};
const admin = await mysql.createConnection(connectionOptions);
let created = false;
let backend;
let frontend;
let browser;
const errors = [];
const childEnv = {
  ...process.env,
  NODE_ENV: "test",
  PORT: backendPort,
  FRONTEND_URL: frontendUrl,
  DB_HOST: connectionOptions.host,
  DB_PORT: String(connectionOptions.port),
  DB_USER: connectionOptions.user,
  DB_PASSWORD: connectionOptions.password,
  DB_NAME: database,
  JWT_SECRET: secret,
  JWT_EXPIRES_SECONDS: "3600",
  COOKIE_SAME_SITE: "lax",
};

function startBackend() {
  return spawn(process.execPath, ["server.js"], {
    cwd: backendRoot,
    env: childEnv,
    windowsHide: true,
    stdio: "ignore",
  });
}

async function waitFor(url) {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      /* El servidor está iniciando. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`El servidor no inició: ${url}`);
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exit = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await exit;
}

try {
  await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  created = true;
  await admin.query(`USE \`${database}\``);
  const schema = await readFile(
    path.join(backendRoot, "database/schema.sql"),
    "utf8",
  );
  await admin.query(schema.slice(schema.indexOf("CREATE TABLE")));
  await applyMigrations(admin);
  backend = startBackend();
  frontend = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "localhost",
      "--port",
      frontendPort,
      "--strictPort",
    ],
    {
      cwd: frontendRoot,
      env: { ...process.env, VITE_API_URL: apiUrl },
      windowsHide: true,
      stdio: "ignore",
    },
  );
  await Promise.all([waitFor(`${apiUrl}/auth/me`), waitFor(frontendUrl)]);
  browser = await chromium.launch({
    ...(process.env.TEST_BROWSER_EXECUTABLE
      ? { executablePath: process.env.TEST_BROWSER_EXECUTABLE }
      : {}),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/Argentina/Buenos_Aires",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  const email = `dashboard-${Date.now()}@example.com`;
  const password = "UnHabitoCadaDia!";
  const greeting = () =>
    page.getByRole("heading", { name: "Hola, María", exact: true });
  async function login() {
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .last()
      .click();
    await greeting().waitFor();
  }
  async function noOverflow() {
    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll(".dashboard-shell *")]
        .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
        .map((el) => ({
          tag: el.tagName,
          cls: el.className,
          right: el.getBoundingClientRect().right,
        }))
        .slice(0, 15),
    }));
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      JSON.stringify(dimensions),
    );
  }

  for (const route of [
    "/dashboard",
    "/dashboard/habitos",
    "/dashboard/estadisticas",
    "/dashboard/configuracion",
    "/dashboard/logros",
    "/dashboard/recordatorios",
    "/MiCuenta",
  ]) {
    await page.goto(`${frontendUrl}${route}`);
    await page.waitForURL("**/IniciarSesion");
    assert.equal(await page.locator(".dashboard-shell").count(), 0);
  }
  console.log("OK: todas las rutas privadas rechazan visitantes anónimos.");

  await page.goto(`${frontendUrl}/Registro`);
  await page.getByLabel("Nombre", { exact: true }).fill("María");
  await page.getByLabel("Apellido", { exact: true }).fill("Prueba");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.waitForURL("**/IniciarSesion");
  await page
    .getByText("Cuenta creada correctamente. Inicia sesión para continuar.")
    .waitFor();
  let releaseSession;
  const sessionGate = new Promise((resolve) => {
    releaseSession = resolve;
  });
  await context.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    await sessionGate;
    await route.fulfill({ response });
  });
  const signingIn = login();
  await page.getByText("Comprobando tu sesión…", { exact: true }).waitFor();
  assert.equal(await page.locator(".dashboard-shell").count(), 0);
  releaseSession();
  await signingIn;
  await context.unroute("**/api/auth/me");
  await page
    .getByText("No hay hábitos programados para hoy.", { exact: true })
    .first()
    .waitFor();
  assert.deepEqual(
    await page.locator(".dashboard-stat > strong").allTextContents(),
    ["0", "0", "0", "—"],
  );
  assert.equal(await page.locator(".habit-card").count(), 0);
  const cookie = (await context.cookies()).find(
    (item) => item.name === "habitly_session",
  );
  assert.ok(cookie.httpOnly);
  assert.equal(cookie.sameSite, "Lax");
  assert.equal(cookie.path, "/api");
  assert.equal(
    await page.evaluate(() => document.cookie.includes("habitly_session")),
    false,
  );
  const profile = await (await context.request.get(`${apiUrl}/auth/me`)).json();
  console.log(
    "OK: registro/login reales, cookie HttpOnly y contenido oculto durante verificación.",
  );

  await page.reload();
  await greeting().waitFor();
  await page.goto(`${frontendUrl}/IniciarSesion`);
  await page.waitForURL("**/dashboard");
  await greeting().waitFor();
  for (const [label, heading] of [
    ["Mis hábitos", "Mis hábitos"],
    ["Estadísticas", "Estadísticas"],
    ["Configuración", "Configuración"],
    ["Inicio", "Hola, María"],
  ]) {
    await page
      .getByRole("navigation", { name: "Navegación del Dashboard" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await page.getByRole("heading", { name: heading, exact: true }).waitFor();
    await noOverflow();
  }
  await page.goto(`${frontendUrl}/MiCuenta`);
  await page.waitForURL("**/dashboard/configuracion");
  await page.getByText(email, { exact: true }).waitFor();
  console.log(
    "OK: recarga, login con sesión existente, navegación y compatibilidad de MiCuenta.",
  );

  const artifactDir = process.env.TEST_ARTIFACT_DIR;
  if (artifactDir) await mkdir(artifactDir, { recursive: true });
  await page.goto(`${frontendUrl}/dashboard`);
  await greeting().waitFor();
  if (artifactDir)
    await page.screenshot({
      path: path.join(artifactDir, "dashboard-desktop.png"),
      fullPage: true,
    });
  for (const width of [1024, 768, 760, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow();
    if (width <= 760) {
      await page.getByRole("button", { name: "Abrir navegación" }).click();
      await page
        .getByRole("navigation", { name: "Navegación del Dashboard" })
        .getByRole("link", { name: "Configuración", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Configuración", exact: true })
        .waitFor();
      await noOverflow();
      await page.getByRole("button", { name: "Abrir navegación" }).click();
      await page.keyboard.press("Escape");
      assert.equal(
        await page
          .getByRole("button", { name: "Abrir navegación" })
          .getAttribute("aria-expanded"),
        "false",
      );
      await page.goto(`${frontendUrl}/dashboard`);
      await greeting().waitFor();
    }
  }
  if (artifactDir)
    await page.screenshot({
      path: path.join(artifactDir, "dashboard-mobile.png"),
      fullPage: true,
    });
  await page.setViewportSize({ width: 1440, height: 1000 });
  console.log(
    "OK: menú móvil, Escape y ausencia de desbordamiento en cinco tamaños.",
  );
  await runHabitBrowserFlow({
    page,
    context,
    browser,
    frontendUrl,
    apiUrl,
    artifactDir,
  });
  await runExperienceBrowserFlow({
    browser,
    frontendUrl,
    apiUrl,
    artifactDir,
    admin,
  });

  await context.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        mensaje: "Servidor temporalmente no disponible.",
      }),
    }),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "No pudimos verificar tu sesión" })
    .waitFor();
  assert.equal(await page.locator(".dashboard-shell").count(), 0);
  await context.unroute("**/api/auth/me");
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await greeting().waitFor();
  await context.route("**/api/auth/logout", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ mensaje: "No se pudo invalidar la sesión." }),
    }),
  );
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "No se pudo cerrar la sesión" })
    .waitFor();
  await greeting().waitFor();
  await context.unroute("**/api/auth/logout");
  console.log(
    "OK: error de verificación oculta datos; un logout fallido permite reintentar.",
  );

  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.waitForURL("**/IniciarSesion");
  assert.equal(
    (await context.cookies()).some((item) => item.name === "habitly_session"),
    false,
  );
  assert.equal(
    (
      await context.request.get(`${apiUrl}/auth/me`, {
        headers: { Cookie: `habitly_session=${cookie.value}` },
      })
    ).status(),
    401,
  );
  await stop(backend);
  backend = startBackend();
  await waitFor(`${apiUrl}/auth/me`);
  assert.equal(
    (
      await context.request.get(`${apiUrl}/auth/me`, {
        headers: { Cookie: `habitly_session=${cookie.value}` },
      })
    ).status(),
    401,
  );
  await page.goto(`${frontendUrl}/dashboard`);
  await page.waitForURL("**/IniciarSesion");
  await login();
  const newCookie = (await context.cookies()).find(
    (item) => item.name === "habitly_session",
  );
  assert.notEqual(newCookie.value, cookie.value);
  await context.request.post(`${apiUrl}/auth/logout`, { data: {} });
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.waitForURL("**/IniciarSesion");
  console.log(
    "OK: logout, rechazo de token copiado incluso tras reiniciar la API, nuevo login y revocación externa.",
  );

  const shortToken = jwt.sign({ id: profile.usuario.id }, secret, {
    algorithm: "HS256",
    expiresIn: 3,
    issuer: "habit-tracker-api",
    audience: "habit-tracker-web",
    jwtid: randomUUID(),
  });
  await context.addCookies([
    {
      ...cookie,
      value: shortToken,
      expires: Math.floor(Date.now() / 1000) + 60,
    },
  ]);
  await page.goto(`${frontendUrl}/dashboard`);
  await greeting().waitFor();
  await page.waitForURL("**/IniciarSesion", { timeout: 10000 });
  assert.equal(await page.locator(".dashboard-shell").count(), 0);
  assert.equal((await context.request.get(`${apiUrl}/auth/me`)).status(), 401);
  assert.deepEqual(errors, []);
  console.log(
    "OK: expiración real del JWT oculta el Dashboard y el servidor responde 401. Sin errores de React.",
  );
} finally {
  if (browser) await browser.close();
  await Promise.all([stop(frontend), stop(backend)]);
  if (created)
    console.log(`Base de navegador conservada, sin DROP: ${database}`);
  await admin.end();
}
