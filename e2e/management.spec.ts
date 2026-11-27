import { test, expect } from "@playwright/test";
test.beforeEach(async ({ request }) => {
  await request.post("/api/admin", {
    data: { action: "reset", confirmation: "RESTABLECER" },
  });
});
test("recepción crea, cambia servicio y profesional, y cancela una cita", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/demo?vista=negocio");
  await page.getByRole("button", { name: "Nueva cita", exact: true }).click();
  await page.getByRole("button", { name: /Podología Cuida/ }).click();
  await page.locator(".calendar-week button:not([disabled])").first().click();
  await page.locator(".time-grid button").first().click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Nombre y apellidos").fill("Reserva Recepción Prueba");
  await page.getByLabel("Teléfono", { exact: true }).fill("000444555");
  await page.getByLabel(/Acepto que la clínica/).check();
  await page.getByRole("button", { name: "Revisar mi cita" }).click();
  await page.getByRole("button", { name: "Confirmar mi reserva" }).click();
  await expect(page.getByText("Cita guardada en la agenda.")).toBeVisible();
  const state = await (await request.get("/api/business")).json();
  const c = state.clients.find(
    (c: { name: string }) => c.name === "Reserva Recepción Prueba",
  );
  const original = state.bookings.find(
    (b: { clientId: string }) => b.clientId === c.id,
  );
  await page
    .getByRole("button", { name: /Abrir cita de Reserva Recepción Prueba/ })
    .click();
  await page.getByRole("button", { name: "Reprogramar", exact: true }).click();
  await page.getByRole("button", { name: "Cambiar", exact: true }).click();
  await page.getByRole("button", { name: /Osteopatía Una atención/ }).click();
  await page.locator(".calendar-week button:not([disabled])").nth(1).click();
  await page.locator(".time-grid button").first().click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Guardar nueva fecha" }).click();
  await expect(
    page.getByText("Cita reprogramada. La hora anterior queda libre."),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Osteopatía", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Laura", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("button", { name: "Sí, cancelar", exact: true }).click();
  await expect(
    page.getByRole("dialog").locator(".booking-detail-head .badge"),
  ).toContainText("Cancelada");
  const final = await (await request.get("/api/business")).json();
  const b = final.bookings.find((b: { id: string }) => b.id === original.id);
  expect(b.status).toBe("cancelada");
  expect(b.serviceId).toBe("osteo");
  expect(b.price).toBe(4800);
});
test("cliente gestiona una cita futura y descarga su calendario", async ({
  page,
  request,
}) => {
  const config = await (await request.get("/api/config")).json();
  const days = await (
    await request.get(
      `/api/availability?serviceId=podo&from=${config.meta.now.slice(0, 10)}&days=7`,
    )
  ).json();
  const future = days
    .slice(3)
    .find((d: { slots: unknown[] }) => d.slots.length);
  const created = await (
    await request.post("/api/bookings", {
      data: {
        ...future.slots[0],
        serviceId: "podo",
        operationKey: "future-client-test",
        client: {
          name: "Cliente Gestión Prueba",
          phone: "000555666",
          privacyConsent: true,
        },
      },
    })
  ).json();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo?vista=cliente");
  await page
    .getByRole("button", { name: "Consultar o gestionar mi cita" })
    .click();
  await page.getByLabel("Localizador", { exact: true }).fill(created.code);
  await page.getByLabel("Teléfono", { exact: true }).fill("000555666");
  await page
    .getByRole("button", { name: "Consultar cita", exact: true })
    .click();
  await page.getByRole("button", { name: "Cambiar cita", exact: true }).click();
  await page.locator(".calendar-week button:not([disabled])").nth(4).click();
  await page.locator(".time-grid button").first().click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Guardar nueva fecha" }).click();
  await expect(
    page.getByRole("heading", { name: "¡Nos vemos pronto!" }),
  ).toBeVisible();
  const calendarPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Añadir a mi calendario" }).click();
  expect((await calendarPromise).suggestedFilename()).toBe(
    `${created.code}.ics`,
  );
  await page
    .getByRole("button", { name: "Cambiar o cancelar mi cita" })
    .click();
  await page
    .getByRole("button", { name: "Cancelar cita", exact: true })
    .click();
  await page.getByRole("button", { name: "Sí, cancelar cita" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu cita está cancelada" }),
  ).toBeVisible();
});
