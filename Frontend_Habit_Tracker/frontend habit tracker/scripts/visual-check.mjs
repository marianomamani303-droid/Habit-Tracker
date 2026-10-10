import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { applyMigrations } from "../../../Backend_Habit_Tracker/src/config/migrations.js";

const frontendRoot = fileURLToPath(new URL("../", import.meta.url));
const backendRoot = fileURLToPath(
  new URL("../../../Backend_Habit_Tracker/", import.meta.url),
);
const require = createRequire(path.join(backendRoot, "package.json"));
const { chromium } = require("playwright");
const mysql = require("mysql2/promise");
// Explicit test connection only: never fall back to the application's .env.
for (const name of ["TEST_DB_HOST", "TEST_DB_PORT", "TEST_DB_USER"]) {
  assert.ok(process.env[name], `Set ${name} to an isolated MySQL instance.`);
}
const database = `habit_visual_test_${Date.now()}_${process.pid}`;
const apiUrl = "http://localhost:3003/api";
const frontendUrl = "http://localhost:5176";
const artifactDir = path.resolve(frontendRoot, "test-artifacts/orbit");
await mkdir(artifactDir, { recursive: true });
const admin = await mysql.createConnection({
  host: process.env.TEST_DB_HOST,
  port: Number(process.env.TEST_DB_PORT),
  user: process.env.TEST_DB_USER,
  password: process.env.TEST_DB_PASSWORD ?? "",
});
let backend, frontend, browser;
const errors = [];
const childEnv = {
  ...process.env,
  NODE_ENV: "test",
  PORT: "3003",
  FRONTEND_URL: frontendUrl,
  DB_HOST: process.env.TEST_DB_HOST,
  DB_PORT: process.env.TEST_DB_PORT,
  DB_USER: process.env.TEST_DB_USER,
  DB_PASSWORD: process.env.TEST_DB_PASSWORD ?? "",
  DB_NAME: database,
  JWT_SECRET: randomBytes(48).toString("hex"),
  JWT_EXPIRES_SECONDS: "3600",
  COOKIE_SAME_SITE: "lax",
};
async function waitFor(url) {
  for (let index = 0; index < 100; index++) {
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server unavailable: ${url}`);
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  child.kill();
  await exited;
}
async function noOverflow(page, label) {
  const sizes = await page.evaluate(() => ({
    viewport: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll("main *")]
      .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
      .map((el) => ({
        tag: el.tagName,
        cls: el.getAttribute("class"),
        right: el.getBoundingClientRect().right,
      }))
      .slice(0, 8),
  }));
  assert.ok(
    sizes.scroll <= sizes.viewport,
    `${label}: ${JSON.stringify(sizes)}`,
  );
}
async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".animated-number")].every(
      (el) =>
        el.textContent === "—" ||
        el.textContent === el.getAttribute("aria-label"),
    ),
  );
  await page.screenshot({
    path: path.join(artifactDir, name + ".png"),
    fullPage: true,
    animations: "disabled",
  });
}
try {
  await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`);
  await admin.query(`USE \`${database}\``);
  const schema = await readFile(
    path.join(backendRoot, "database/schema.sql"),
    "utf8",
  );
  await admin.query(schema.slice(schema.indexOf("CREATE TABLE")));
  await applyMigrations(admin);
  backend = spawn(process.execPath, ["server.js"], {
    cwd: backendRoot,
    env: childEnv,
    windowsHide: true,
    stdio: "ignore",
  });
  frontend = spawn(
    process.execPath,
    [
      "node_modules/vite/bin/vite.js",
      "--host",
      "localhost",
      "--port",
      "5176",
      "--strictPort",
    ],
    {
      cwd: frontendRoot,
      env: { ...process.env, VITE_API_URL: apiUrl },
      windowsHide: true,
      stdio: "ignore",
    },
  );
  await Promise.all([waitFor(frontendUrl), waitFor(apiUrl + "/auth/me")]);
  browser = await chromium.launch({
    executablePath: process.env.TEST_BROWSER_EXECUTABLE,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/Argentina/Buenos_Aires",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/IniciarSesion", "/Registro", "/recuperar"]) {
      await page.goto(frontendUrl + route);
      await page.locator("main").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await noOverflow(page, `Public ${route} @ ${width}`);
      if (width === 1440 || width === 390)
        await screenshot(
          page,
          `${route === "/" ? "home" : route.slice(1).toLowerCase()}-${width}`,
        );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(frontendUrl + "/");
  await page.getByRole("link", { name: "Explorar Habitly" }).click();
  assert.ok(page.url().endsWith("#como-funciona"));
  await page
    .getByRole("heading", { name: "Tu rutina, en tres movimientos." })
    .waitFor();
  await page.goto(frontendUrl + "/IniciarSesion");
  await page.getByLabel("Email", { exact: true }).focus();
  assert.notEqual(
    await page
      .getByLabel("Email", { exact: true })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
    "none",
  );
  assert.equal(
    await page.evaluate(() => document.documentElement.lang),
    "es-AR",
  );
  console.log(
    "OK: home, login, registro y recuperación en cinco tamaños, CTAs y foco.",
  );

  const credentials = {
    email: `orbit-${Date.now()}@example.test`,
    password: "Orbit!2026",
    confirmar: "Orbit!2026",
    nombre: "Sofía",
    apellido: "Órbita",
  };
  assert.equal(
    (
      await context.request.post(apiUrl + "/auth/register", {
        data: credentials,
      })
    ).status(),
    201,
  );
  assert.equal(
    (
      await context.request.post(apiUrl + "/auth/login", { data: credentials })
    ).status(),
    200,
  );
  const summary = await (
    await context.request.get(apiUrl + "/habitos/resumen")
  ).json();
  const date = summary.fecha;
  const earlier = (amount) => {
    const day = new Date(date + "T12:00:00Z");
    day.setUTCDate(day.getUTCDate() - amount);
    return day.toISOString().slice(0, 10);
  };
  const created = await context.request.post(apiUrl + "/habitos", {
    data: {
      nombre: "Lectura con intención",
      descripcion: "Un momento para aprender algo nuevo.",
      frecuencia: "diario",
      inicio: earlier(2),
      objetivo: 20,
      unidad: "páginas",
    },
  });
  assert.equal(created.status(), 201);
  const habit = (await created.json()).habito;
  for (const day of [earlier(2), earlier(1)])
    assert.equal(
      (
        await context.request.put(
          `${apiUrl}/habitos/${habit.id}/registros/${day}`,
          { data: { cantidad: 20 } },
        )
      ).status(),
      200,
    );
  await page.goto(`${frontendUrl}/dashboard/habitos/${habit.id}`);
  const input = page.getByLabel("Cantidad para Lectura con intención");
  const save = page.getByRole("button", {
    name: "Guardar progreso",
    exact: true,
  });
  await input.fill("10");
  await save.click();
  await page.getByText("Progreso actualizado.", { exact: true }).waitFor();
  assert.equal(await page.locator(".celebration").count(), 0);
  const progressRoute = `**/habitos/${habit.id}/registros/${date}`;
  await page.route(progressRoute, (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ mensaje: "No pudimos guardar este avance." }),
    }),
  );
  await input.fill("20");
  await save.click();
  await page.locator(".habit-card [role=alert]").waitFor();
  assert.equal(await page.locator(".celebration").count(), 0);
  await page.unroute(progressRoute);

  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let intercepted;
  const interception = new Promise((resolve) => {
    intercepted = resolve;
  });
  await page.route(progressRoute, async (route) => {
    intercepted();
    await gate;
    await route.continue();
  });
  await save.click();
  await interception;
  assert.equal(
    await page.locator(".celebration").count(),
    0,
    "No celebration before server confirmation",
  );
  release();
  await page
    .locator(".celebration")
    .getByText("Objetivo alcanzado ✦", { exact: true })
    .waitFor();
  await page
    .getByText("¡Nueva racha: 3 días programados!", { exact: true })
    .waitFor();
  const persisted = (
    await (await context.request.get(`${apiUrl}/habitos/${habit.id}`)).json()
  ).habito;
  assert.equal(persisted.hoy.completado, true);
  assert.equal(persisted.rachaActual, 3);
  await screenshot(page, "completion-desktop");
  await page.unroute(progressRoute);
  await page.locator(".celebration").waitFor({ state: "hidden" });
  await save.click();
  await page
    .getByText("¡Un paso más! Hábito completado.", { exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".celebration").count(),
    0,
    "Repeated save is not a new completion",
  );
  await page.reload();
  await page.getByText("Completado", { exact: true }).waitFor();
  assert.equal(
    await page.locator(".celebration").count(),
    0,
    "Reload does not celebrate old records",
  );

  const taskHabit = (
    await (
      await context.request.post(apiUrl + "/habitos", {
        data: {
          nombre: "Ritual de foco",
          descripcion: "Preparar el espacio y elegir una intención.",
          frecuencia: "diario",
          inicio: date,
          objetivo: 1,
          unidad: "",
        },
      })
    ).json()
  ).habito;
  for (const nombre of ["Preparar mi espacio", "Elegir mi intención"])
    assert.equal(
      (
        await context.request.post(
          `${apiUrl}/habitos/${taskHabit.id}/subtareas`,
          { data: { nombre } },
        )
      ).status(),
      201,
    );
  await page.goto(`${frontendUrl}/dashboard/habitos/${taskHabit.id}`);
  await page.getByLabel("Preparar mi espacio", { exact: true }).check();
  await page.getByText("1 de 2 pasos", { exact: true }).waitFor();
  assert.equal(await page.locator(".celebration").count(), 0);
  await page.getByLabel("Elegir mi intención", { exact: true }).check();
  await page.locator(".celebration").waitFor();
  await page.getByText("Completado", { exact: true }).waitFor();
  await page.locator(".celebration").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Desmarcar todos los pasos" }).click();
  await page.getByText("0 de 2 pasos", { exact: true }).waitFor();
  assert.equal(await page.locator(".celebration").count(), 0);
  console.log(
    "OK: celebración solo con confirmación real; errores, parciales, repetición, recarga y desmarcado; racha de tres y subtareas.",
  );

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/dashboard",
      "/dashboard/habitos",
      `/dashboard/habitos/${taskHabit.id}`,
      "/dashboard/historial",
      "/dashboard/estadisticas",
      "/dashboard/configuracion",
      "/dashboard/logros",
      "/dashboard/recordatorios",
      "/dashboard/habitos/nuevo",
      `/dashboard/habitos/${taskHabit.id}/editar`,
    ]) {
      await page.goto(frontendUrl + route);
      if (route.endsWith("/estadisticas"))
        await page.locator(".habit-chart").waitFor();
      else if (route.endsWith("/historial"))
        await page.locator(".calendar-day").first().waitFor();
      else if (route.endsWith("/configuracion"))
        await page
          .getByRole("button", { name: "Guardar perfil", exact: true })
          .waitFor();
      else if (route.endsWith("/logros"))
        await page.locator(".habit-medal").first().waitFor();
      else if (route.endsWith("/recordatorios"))
        await page
          .getByRole("heading", { name: "Recordatorios", exact: true })
          .waitFor();
      else if (route.endsWith("/nuevo") || route.endsWith("/editar"))
        await page.getByLabel("Nombre", { exact: true }).waitFor();
      else
        await page
          .getByRole("heading", { name: "Ritual de foco", exact: true })
          .waitFor();
      await noOverflow(page, `${route} @ ${width}`);
      if (width === 1440 || width === 390)
        await screenshot(
          page,
          `${route.split("/").at(-1) === "dashboard" ? "dashboard" : route.split("/").at(-1)}-${width}`,
        );
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(frontendUrl + "/dashboard");
  await page
    .locator(".dashboard-progress-ring .animated-number")
    .filter({ hasText: "50%" })
    .waitFor();
  await page.waitForFunction(() =>
    [...document.querySelectorAll(".animated-number")].every(
      (el) => el.textContent === el.getAttribute("aria-label"),
    ),
  );
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== "running"),
  );
  assert.equal(
    await page.evaluate(
      () => document.querySelectorAll(".habit-skeleton").length,
    ),
    0,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(frontendUrl + "/dashboard");
  await page
    .locator(".dashboard-progress-ring .animated-number")
    .filter({ hasText: "50%" })
    .waitFor();
  const durations = await page.locator(".page-transition").evaluate((el) => ({
    animation: getComputedStyle(el).animationDuration,
    transition: getComputedStyle(el).transitionDuration,
  }));
  assert.ok(parseFloat(durations.animation) <= 0.00001);
  await page.goto(`${frontendUrl}/dashboard/habitos/${taskHabit.id}`);
  await page.getByRole("button", { name: "Completar todos los pasos" }).click();
  await page.locator(".celebration").waitFor();
  assert.equal(
    await page
      .locator(".celebration-particles")
      .evaluate((el) => getComputedStyle(el).display),
    "none",
  );
  assert.deepEqual(errors, []);
  console.log(
    "OK: progreso 50% real, contadores convergen, animaciones finitas y movimiento reducido sin partículas. Sin errores de React.",
  );
  console.log(`Capturas: ${artifactDir}`);
} finally {
  if (browser) await browser.close();
  await Promise.all([stop(frontend), stop(backend)]);
  await admin.end();
  console.log(`Base aislada conservada: ${database}`);
}
