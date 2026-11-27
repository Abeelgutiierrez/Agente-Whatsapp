import { test, expect } from "@playwright/test";
test("conversación de WhatsApp → reserva → aviso en la vista negocio", async ({
  browser,
  request,
}) => {
  await request.post("/api/admin", {
    data: { action: "reset", confirmation: "RESTABLECER" },
  });
  const customer = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const owner = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await customer.newPage();
  const panel = await owner.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  panel.on("pageerror", (e) => errors.push(e.message));
  await panel.goto("/demo?vista=negocio");
  await expect(
    panel.getByRole("heading", { name: "Buenos días, equipo" }),
  ).toBeVisible({ timeout: 30000 });
  await page.goto("/demo?vista=cliente");
  const chat = page.getByRole("log", { name: "Conversación" });
  const replies = page.getByRole("group", { name: "Respuestas rápidas" });
  const input = page.getByLabel("Escribe un mensaje");
  // Texto libre: el asistente reconoce el servicio.
  await input.fill("Hola, quiero fisio");
  await input.press("Enter");
  await expect(chat).toContainText("Genial, Fisioterapia");
  await replies.getByRole("button").first().click();
  await expect(chat).toContainText("Tengo estas horas libres");
  await replies.getByRole("button").first().click();
  await expect(chat).toContainText("¿Cómo te llamas?");
  await input.fill("Bruno Prueba WhatsApp");
  await input.press("Enter");
  await expect(chat).toContainText("¿A qué teléfono");
  await input.fill("000 987 655");
  await input.press("Enter");
  await replies.getByRole("button", { name: "Acepto", exact: true }).click();
  await replies.getByRole("button", { name: "No, gracias" }).click();
  await expect(chat).toContainText("Repasamos tu cita");
  await replies.getByRole("button", { name: "Sí, confirmar" }).click();
  await expect(chat).toContainText("Tu cita está confirmada");
  await expect(chat).toContainText(/Localizador: AR-/);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  // El panel del negocio, abierto en otro navegador, recibe el aviso.
  await expect(panel.locator(".toast")).toContainText(
    "Nueva reserva por WhatsApp: Bruno Prueba WhatsApp",
    { timeout: 15000 },
  );
  await expect(panel.locator(".whatsapp-item")).toContainText(
    "Bruno Prueba WhatsApp",
  );
  // Desde el móvil, el atajo de la demo abre la cita en la vista negocio.
  await page.getByRole("button", { name: "Ver en la vista negocio" }).click();
  await expect(page.getByRole("dialog")).toContainText("Reserva por WhatsApp");
  await expect(page.getByRole("dialog")).toContainText("Bruno Prueba WhatsApp");
  expect(errors).toEqual([]);
  await customer.close();
  await owner.close();
});
