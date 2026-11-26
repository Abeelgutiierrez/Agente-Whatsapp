import { test, expect } from "@playwright/test";
test("reserva móvil → agenda en otro navegador → hueco ocupado", async ({
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
  panel.on("pageerror", (error) =>
    console.error("Error navegador negocio:", error.message),
  );
  page.on("pageerror", (error) =>
    console.error("Error navegador cliente:", error.message),
  );
  await panel.goto("/demo");
  await expect(
    panel.getByRole("heading", { name: "Buenos días, equipo" }),
  ).toBeVisible({ timeout: 30000 });
  await page.goto("/demo?vista=cliente");
  await page
    .getByRole("button", { name: "Prefiero reservar con el formulario" })
    .click();
  await page.getByRole("button", { name: /Fisioterapia Recupera/ }).click();
  await page.locator(".calendar-week button:not([disabled])").first().click();
  const selected = await page.locator(".time-grid button").first().innerText();
  await page.locator(".time-grid button").first().click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Nombre y apellidos").fill("Alba Prueba Vertical");
  await page.getByLabel("Teléfono", { exact: true }).fill("000987654");
  await page.getByLabel(/Acepto que la clínica/).check();
  await page.getByRole("button", { name: "Revisar mi cita" }).click();
  const freeByStart = async () => {
    const meta = (await (await request.get("/api/config")).json()).meta;
    const days = await (
      await request.get(
        `/api/availability?serviceId=fisio&from=${meta.now.slice(0, 10)}&days=7`,
      )
    ).json();
    const count: Record<string, number> = {};
    for (const d of days as { slots: { start: string }[] }[])
      for (const slot of d.slots)
        count[slot.start] = (count[slot.start] ?? 0) + 1;
    return count;
  };
  const before = await freeByStart();
  await page.getByRole("button", { name: "Confirmar mi reserva" }).click();
  await expect(
    page.getByRole("heading", { name: "¡Nos vemos pronto!" }),
  ).toBeVisible();
  await expect(
    panel.getByText("Alba Prueba Vertical", { exact: true }),
  ).toBeVisible();
  const code = await page.locator(".ticket-top strong").innerText();
  await page.reload();
  await page
    .getByRole("button", { name: "Consultar o gestionar mi cita" })
    .click();
  await page.getByLabel("Localizador", { exact: true }).fill(code);
  await page.getByLabel("Teléfono", { exact: true }).fill("000987654");
  await page
    .getByRole("button", { name: "Consultar cita", exact: true })
    .click();
  await expect(page.locator(".manage-result")).toContainText("Fisioterapia");
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page
    .getByRole("button", { name: "Prefiero reservar con el formulario" })
    .click();
  await page.getByRole("button", { name: /Fisioterapia Recupera/ }).click();
  await page.locator(".calendar-week button:not([disabled])").first().click();
  // La plaza reservada ya no se ofrece: a esa hora queda un profesional libre menos.
  const after = await freeByStart();
  const state = await (await request.get("/api/business")).json();
  const bookedStart = state.bookings.find(
    (b: { clientId: string }) =>
      state.clients.find((c: { id: string }) => c.id === b.clientId)?.name ===
      "Alba Prueba Vertical",
  ).start;
  expect(after[bookedStart] ?? 0).toBe(before[bookedStart] - 1);
  if (before[bookedStart] === 1)
    await expect(
      page.locator(".time-grid button").filter({ hasText: selected }),
    ).toHaveCount(0);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/client-mobile.png",
    fullPage: true,
  });
  await panel.screenshot({
    path: "test-results/business-desktop.png",
    fullPage: true,
  });
  await customer.close();
  await owner.close();
});
