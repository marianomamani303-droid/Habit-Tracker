import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";
import { randomBytes, createHash } from "node:crypto";

export async function runExperienceBrowserFlow({
  browser,
  frontendUrl,
  apiUrl,
  artifactDir,
  admin,
}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    timezoneId: "America/Argentina/Buenos_Aires",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const credentials = {
    nombre: "Lucía",
    apellido: "Prueba",
    email: `experience-${Date.now()}@example.test`,
    password: "Experience!2026",
    confirmar: "Experience!2026",
  };
  try {
    const registered = await context.request.post(`${apiUrl}/auth/register`, {
      data: credentials,
    });
    assert.equal(registered.status(), 201);
    const userId = (await registered.json()).usuario.id;
    assert.equal(
      (
        await context.request.post(`${apiUrl}/auth/login`, {
          data: credentials,
        })
      ).status(),
      200,
    );
    await page.goto(`${frontendUrl}/dashboard/habitos/nuevo`);
    await page.getByLabel("Nombre", { exact: true }).fill("Mi ritual de calma");
    await page
      .getByLabel("Frecuencia", { exact: true })
      .selectOption("personalizado");
    await page.getByLabel("Cada cuántos días").fill("3");
    await page
      .getByRole("button", { name: "Crear hábito", exact: true })
      .click();
    await page.waitForURL(/\/dashboard\/habitos\/\d+$/);
    const habitId = page.url().split("/").at(-1);
    for (const name of ["Preparar mi espacio", "Respirar con calma"]) {
      await page.getByLabel("Nueva subtarea", { exact: true }).fill(name);
      await page
        .getByRole("button", { name: "Agregar subtarea", exact: true })
        .click();
      await page.getByLabel(name, { exact: true }).waitFor();
    }
    await page.getByLabel("Preparar mi espacio", { exact: true }).check();
    await page.getByText("1 de 2 pasos", { exact: true }).waitFor();
    await page.getByLabel("Respirar con calma", { exact: true }).check();
    await page.getByText("Completado", { exact: true }).waitFor();
    await page.reload();
    await page.getByText("Completado", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Desmarcar todos los pasos", exact: true })
      .click();
    await page.getByText("0 de 2 pasos", { exact: true }).waitFor();
    await page.getByLabel("Horario del recordatorio").fill("00:00");
    await page.getByLabel("Activar recordatorio", { exact: true }).check();
    await page
      .getByRole("button", { name: "Guardar recordatorio", exact: true })
      .click();
    await page.getByText("Recordatorio guardado.", { exact: true }).waitFor();
    await page.goto(`${frontendUrl}/dashboard/recordatorios`);
    await page
      .getByRole("link", { name: "Mi ritual de calma", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Marcar leído", exact: true })
      .click();
    await page.getByText(/Leído$/).waitFor();
    await page.goto(`${frontendUrl}/dashboard/logros`);
    await page
      .getByRole("heading", { name: "La primera hoja", exact: true })
      .waitFor();
    assert.equal(await page.locator(".habit-medal.is-unlocked").count(), 1);
    await page.goto(`${frontendUrl}/dashboard/estadisticas`);
    await page.getByLabel("Período", { exact: true }).selectOption("ano");
    await page
      .getByRole("button", { name: "Consultar período", exact: true })
      .click();
    await page.locator(".habit-chart-column").nth(11).waitFor();
    assert.equal(await page.locator(".habit-chart-column").count(), 12);
    await page.locator(".habit-chart-column").first().focus();
    await page
      .getByRole("status")
      .filter({ hasText: /Sin obligaciones programadas/ })
      .waitFor();
    await page.goto(`${frontendUrl}/dashboard/configuracion`);
    await page.getByLabel("Nombre", { exact: true }).fill("Lucía actualizada");
    await page
      .getByLabel("Sobre vos", { exact: true })
      .fill("Crecer un paso a la vez.");
    await page.getByLabel("Zona horaria", { exact: true }).fill("UTC");
    await page
      .getByRole("button", { name: "Guardar perfil", exact: true })
      .click();
    await page
      .getByText("Tu perfil está actualizado.", { exact: true })
      .waitFor();
    await page.reload();
    assert.equal(
      await page.getByLabel("Nombre", { exact: true }).inputValue(),
      "Lucía actualizada",
    );
    const avatar = await sharp({
      create: { width: 40, height: 40, channels: 3, background: "#d9785b" },
    })
      .png()
      .toBuffer();
    await page.getByLabel("Cambiar foto", { exact: true }).setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: avatar,
    });
    await page
      .getByText("Tu foto ya está actualizada.", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("img", { name: "Foto de Lucía actualizada" })
        .count(),
      1,
    );
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of [
        "configuracion",
        "estadisticas",
        "logros",
        "recordatorios",
        `habitos/${habitId}`,
      ]) {
        await page.goto(`${frontendUrl}/dashboard/${route}`);
        await page.locator(".dashboard-shell").waitFor();
        // Wait for actual forms/data, not just the shell, to check layout.
        if (route === "configuracion")
          await page
            .getByRole("button", { name: "Guardar perfil", exact: true })
            .waitFor();
        if (route === "estadisticas")
          await page.locator(".habit-chart").waitFor();
        if (route === "logros")
          await page.locator(".habit-medal").first().waitFor();
        if (route === "recordatorios")
          await page.locator(".habit-notification").first().waitFor();
        if (route.startsWith("habitos/"))
          await page.getByLabel("Horario del recordatorio").waitFor();
        const sizes = await page.evaluate(() => ({
          viewport: innerWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        assert.ok(
          sizes.scroll <= sizes.viewport,
          `Overflow ${route} at ${width}: ${JSON.stringify(sizes)}`,
        );
      }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`${frontendUrl}/dashboard/logros`);
    await page.locator(".habit-medal").first().waitFor();
    const duration = await page
      .locator(".habit-medal-seal")
      .first()
      .evaluate((el) => getComputedStyle(el).animationDuration);
    assert.ok(
      duration === "1e-05s" || duration === "0.00001s" || duration === "0s",
    );
    if (artifactDir) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${frontendUrl}/dashboard/configuracion`);
      await page
        .getByRole("button", { name: "Guardar perfil", exact: true })
        .waitFor();
      await page.screenshot({
        path: path.join(artifactDir, "profile-mobile.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${frontendUrl}/dashboard/logros`);
      await page.locator(".habit-medal").first().waitFor();
      await page.screenshot({
        path: path.join(artifactDir, "medals-desktop.png"),
        fullPage: true,
      });
    }
    await page.goto(`${frontendUrl}/dashboard/configuracion`);
    await page
      .getByLabel("Contraseña actual", { exact: true })
      .fill(credentials.password);
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("NewExperience!2026");
    await page
      .getByLabel("Confirmar nueva contraseña", { exact: true })
      .fill("NewExperience!2026");
    await page
      .getByRole("button", { name: "Cambiar contraseña", exact: true })
      .click();
    await page.waitForURL("**/IniciarSesion");
    const resetToken = randomBytes(32).toString("hex");
    await admin.execute(
      "INSERT INTO password_recuperaciones (token_hash,usuario_id,expira_en) VALUES (?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 30 MINUTE))",
      [createHash("sha256").update(resetToken).digest("hex"), userId],
    );
    await page.goto(`${frontendUrl}/recuperar`);
    await page.evaluate((token) => {
      window.location.hash = "token=" + token;
      window.location.reload();
    }, resetToken);
    await page
      .getByRole("heading", { name: "Elegí una nueva contraseña", exact: true })
      .waitFor();
    assert.ok(!page.url().includes("#"));
    await page
      .getByLabel("Nueva contraseña", { exact: true })
      .fill("Recovered!2026");
    await page
      .getByLabel("Confirmar nueva contraseña", { exact: true })
      .fill("Recovered!2026");
    await page
      .getByRole("button", { name: "Guardar contraseña", exact: true })
      .click();
    await page.waitForURL("**/IniciarSesion");
    assert.equal(
      (
        await context.request.post(`${apiUrl}/auth/login`, {
          data: { email: credentials.email, password: "Recovered!2026" },
        })
      ).status(),
      200,
    );
    console.log(
      "OK: formulario de recuperación consume un token temporal real y lo elimina de la URL.",
    );
    await page.goto(`${frontendUrl}/recuperar`);
    await page.getByLabel("Email", { exact: true }).fill(credentials.email);
    await page
      .getByRole("button", { name: "Solicitar enlace", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: /todavía no está configurada/ })
      .waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "OK: frecuencia personalizada, subtareas, medallas, perfil/foto, contraseña, recordatorios, gráfico anual, cinco tamaños y movimiento reducido. Sin errores de React.",
    );
  } finally {
    await context.close();
  }
}
