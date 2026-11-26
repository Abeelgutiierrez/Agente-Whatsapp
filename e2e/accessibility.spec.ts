import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("contraste, etiquetas y adaptación en cliente y negocio", async ({
  page,
  request,
}) => {
  await request.post("/api/admin", {
    data: { action: "reset", confirmation: "RESTABLECER" },
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Buenos días, equipo" }),
  ).toBeVisible({ timeout: 30000 });
  const desktop = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  console.log(
    "Accesibilidad negocio:",
    JSON.stringify(
      desktop.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ),
  );
  await page.screenshot({
    path: "test-results/business-desktop.png",
    fullPage: true,
  });
  for (const section of [
    "Agenda",
    "Clientes",
    "Cómo va el negocio",
    "Configuración",
  ]) {
    await page.getByRole("button", { name: section, exact: true }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      section,
    ).toEqual([]);
  }
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await page.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 820);
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Vista cliente", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reservar cita", exact: true }),
  ).toBeVisible();
  const mobile = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  console.log(
    "Accesibilidad cliente:",
    JSON.stringify(
      mobile.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ),
  );
  await page.screenshot({
    path: "test-results/welcome-mobile.png",
    fullPage: true,
  });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  expect(desktop.violations.map((v) => v.id)).toEqual([]);
  expect(mobile.violations.map((v) => v.id)).toEqual([]);
  await page
    .getByRole("button", { name: "Prefiero reservar con el formulario" })
    .click();
  const services = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    services.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: /Fisioterapia Recupera/ }).click();
  await page.locator(".calendar-week button:not([disabled])").first().click();
  const calendar = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    calendar.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  ).toEqual([]);
});
