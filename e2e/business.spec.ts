import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  const r = await request.post("/api/admin", {
    data: { action: "reset", confirmation: "RESTABLECER" },
  });
  expect(r.ok()).toBe(true);
});
test("acciones de agenda, cliente, mensajes, conclusiones y CSV", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Buenos días, equipo" }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu agenda" })).toBeVisible();
  const state = await (await request.get("/api/business")).json();
  const b = state.bookings.find(
    (b: { status: string; start: string }) =>
      b.status === "pendiente" &&
      b.start.slice(0, 10) === state.meta.now.slice(0, 10),
  );
  const c = state.clients.find((c: { id: string }) => c.id === b.clientId);
  await page
    .getByRole("button", { name: new RegExp(`^Abrir cita de ${c.name} a las`) })
    .click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".booking-detail-head .badge"),
  ).toContainText("Confirmada");
  await page
    .getByLabel("Nota interna", { exact: true })
    .fill("Prefiere recibir la información al llegar.");
  await page.getByRole("button", { name: "Guardar nota", exact: true }).click();
  await expect(
    page.getByText("Nota interna guardada.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "WhatsApp", exact: true }).click();
  await page
    .getByRole("button", { name: "Simular envío", exact: true })
    .click();
  await expect(
    page.getByText("Mensaje registrado como simulación. No se ha enviado."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir ficha del cliente" }).click();
  await expect(
    page.getByRole("heading", { name: c.name, exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Notas internas", { exact: false })
    .fill("Cliente de ejemplo. Prefiere las tardes.");
  await page
    .getByRole("button", { name: "Guardar ficha", exact: true })
    .click();
  await expect(page.getByText("Ficha de cliente guardada.")).toBeVisible();
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Cómo va el negocio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lo que nos cuentan tus datos" }),
  ).toBeVisible();
  expect(await page.locator(".recommendation").count()).toBeGreaterThanOrEqual(
    3,
  );
  await page.screenshot({
    path: "test-results/insights-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Exportar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Estado", { exact: true }).selectOption("confirmada");
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Descargar CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain(".csv");
  await dialog.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Hoy", exact: true }).first().click();
  await page.screenshot({
    path: "test-results/business-desktop.png",
    fullPage: true,
  });
});
test("configuración persistente y restablecimiento protegido", async ({
  page,
}) => {
  await page.goto("/demo");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByLabel("Nombre del negocio", { exact: true })
    .fill("Clínica Armonía Centro");
  await page
    .getByRole("button", { name: "Guardar configuración", exact: true })
    .click();
  await expect(
    page.getByText(
      "Configuración guardada. La disponibilidad ya está actualizada.",
    ),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator(".sidebar .brand strong")).toHaveText(
    "Clínica Armonía Centro",
  );
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restablecer demo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Restablecer datos", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Escribe RESTABLECER para confirmar")
    .fill("RESTABLECER");
  await page
    .getByRole("button", { name: "Restablecer datos", exact: true })
    .click();
  await expect(page.locator(".sidebar .brand strong")).toHaveText(
    "Clínica Armonía",
  );
});
test("dos reservas simultáneas solo consumen una plaza", async ({
  request,
}) => {
  const config = await (await request.get("/api/config")).json();
  const dates = await (
    await request.get(
      `/api/availability?serviceId=fisio&from=${config.meta.now.slice(0, 10)}`,
    )
  ).json();
  const slot = dates[0].slots[0];
  const data = {
    ...slot,
    serviceId: "fisio",
    client: {
      name: "Prueba simultánea",
      phone: "000111999",
      privacyConsent: true,
    },
  };
  const responses = await Promise.all([
    request.post("/api/bookings", {
      data: { ...data, operationKey: "simultaneous-one" },
    }),
    request.post("/api/bookings", {
      data: { ...data, operationKey: "simultaneous-two" },
    }),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
});
