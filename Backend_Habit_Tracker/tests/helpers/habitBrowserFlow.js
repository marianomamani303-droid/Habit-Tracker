import assert from "node:assert/strict";
import path from "node:path";

export async function runHabitBrowserFlow({
  page,
  context,
  browser,
  frontendUrl,
  apiUrl,
  artifactDir,
}) {
  await page.goto(`${frontendUrl}/dashboard/habitos/nuevo`);
  await page.getByLabel("Nombre", { exact: true }).fill("Lectura de prueba");
  await page
    .getByLabel("Descripción", { exact: true })
    .fill("Registro real en la base aislada.");
  await page.getByLabel("Objetivo por día", { exact: true }).fill("20");
  await page.getByLabel("Unidad (opcional)", { exact: true }).fill("páginas");
  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  await page.waitForURL(/\/dashboard\/habitos\/\d+$/);
  const habitId = Number(page.url().split("/").at(-1));
  await page.getByLabel("Cantidad para Lectura de prueba").fill("20");
  await page.getByRole("button", { name: "Guardar progreso" }).click();
  await page.getByText("Completado", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("Completado", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Cantidad para Lectura de prueba").inputValue(),
    "20",
  );

  await page.getByRole("link", { name: "Editar hábito", exact: true }).click();
  await page.getByLabel("Objetivo por día", { exact: true }).fill("30");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.waitForURL(/\/dashboard\/habitos\/\d+$/);
  await page.getByText("Hay cambios programados", { exact: false }).waitFor();
  await page.getByText("Completado", { exact: true }).waitFor();

  await page.goto(`${frontendUrl}/dashboard/habitos`);
  await page.getByRole("button", { name: "Archivar desde mañana" }).click();
  await page.getByRole("button", { name: "Restaurar desde mañana" }).waitFor();
  await page.getByRole("button", { name: "Restaurar desde mañana" }).click();
  await page.getByRole("button", { name: "Archivar desde mañana" }).waitFor();
  console.log(
    "OK: crear, registrar, recargar, editar, archivar y restaurar desde React.",
  );

  const summary = await (
    await context.request.get(`${apiUrl}/habitos/resumen`)
  ).json();
  const date = summary.fecha;
  await page.goto(`${frontendUrl}/dashboard/historial`);
  await page.getByRole("button", { name: new RegExp(`^${date},`) }).click();
  await page.getByLabel("Cantidad para Lectura de prueba").fill("10");
  await page.getByRole("button", { name: "Guardar progreso" }).click();
  await page
    .getByRole("button", { name: new RegExp(`^${date}, parcial`) })
    .waitFor();
  await page.getByRole("button", { name: "Mes anterior" }).click();
  await page
    .getByRole("heading", { name: "Historial ·", exact: false })
    .waitFor();
  await page.getByRole("button", { name: "Mes siguiente" }).click();
  await page
    .getByRole("button", { name: new RegExp(`^${date}, parcial`) })
    .waitFor();
  await page.goto(`${frontendUrl}/dashboard/estadisticas`);
  await page
    .getByRole("heading", {
      name: "Tu constancia, en perspectiva",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("cell", { name: "Lectura de prueba", exact: true })
    .waitFor();
  console.log(
    "OK: calendario, corrección de progreso y gráficos de estadísticas.",
  );

  const secondContext = await browser.newContext();
  try {
    const credentials = {
      email: `second-${Date.now()}@example.test`,
      password: "AnotherAccount!2026",
    };
    assert.equal(
      (
        await secondContext.request.post(`${apiUrl}/auth/register`, {
          data: {
            ...credentials,
            nombre: "Otra",
            apellido: "Cuenta",
            confirmar: credentials.password,
          },
        })
      ).status(),
      201,
    );
    assert.equal(
      (
        await secondContext.request.post(`${apiUrl}/auth/login`, {
          data: credentials,
        })
      ).status(),
      200,
    );
    assert.equal(
      (
        await secondContext.request.get(`${apiUrl}/habitos/${habitId}`)
      ).status(),
      404,
    );
    assert.equal(
      (
        await secondContext.request.put(
          `${apiUrl}/habitos/${habitId}/registros/${date}`,
          { data: { cantidad: 999 } },
        )
      ).status(),
      404,
    );
    const secondPage = await secondContext.newPage();
    await secondPage.goto(`${frontendUrl}/dashboard/habitos`);
    await secondPage
      .getByText("No hay hábitos para este filtro.", { exact: false })
      .waitFor();
    assert.equal(
      await secondPage
        .getByRole("heading", { name: "Lectura de prueba", exact: true })
        .count(),
      0,
    );
  } finally {
    await secondContext.close();
  }
  console.log(
    "OK: una segunda cuenta no ve ni puede modificar el hábito de la primera.",
  );

  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "habitos",
    "estadisticas",
    "historial",
    `habitos/${habitId}/editar`,
  ]) {
    await page.goto(`${frontendUrl}/dashboard/${route}`);
    await page.locator(".dashboard-shell").waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      `Overflow on ${route}`,
    );
  }
  if (artifactDir)
    await page.screenshot({
      path: path.join(artifactDir, "habit-form-mobile.png"),
      fullPage: true,
    });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${frontendUrl}/dashboard/habitos/nuevo`);
  await page.getByLabel("Nombre", { exact: true }).fill("Meditación semanal");
  await page.getByLabel("Frecuencia", { exact: true }).selectOption("semanal");
  await page.getByLabel("Días a completar por semana").fill("3");
  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  await page.waitForURL(/\/dashboard\/habitos\/\d+$/);
  await page
    .getByRole("button", { name: "Marcar completado", exact: true })
    .click();
  await page.getByRole("button", { name: "Desmarcar", exact: true }).waitFor();
  await page.getByRole("button", { name: "Desmarcar", exact: true }).click();
  await page
    .getByRole("button", { name: "Marcar completado", exact: true })
    .waitFor();

  await page.goto(`${frontendUrl}/dashboard/habitos/nuevo`);
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("Ejercicio en días específicos");
  await page.getByLabel("Frecuencia", { exact: true }).selectOption("dias");
  for (const day of ["Lunes", "Miércoles", "Viernes"])
    await page.getByLabel(day, { exact: true }).check();
  await page.getByRole("button", { name: "Crear hábito", exact: true }).click();
  await page.waitForURL(/\/dashboard\/habitos\/\d+$/);
  console.log(
    "OK: frecuencias semanal y por días, y marcado binario desde React.",
  );
  await page.goto(`${frontendUrl}/dashboard`);
  await page.getByLabel("Cantidad para Lectura de prueba").waitFor();
  if (artifactDir)
    await page.screenshot({
      path: path.join(artifactDir, "habits-dashboard-desktop.png"),
      fullPage: true,
    });
  console.log(
    "OK: nuevas secciones responsive y persistencia real del Dashboard.",
  );
}
