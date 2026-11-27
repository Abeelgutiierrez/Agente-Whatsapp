import { expect, test } from "@playwright/test";

test("landing: vídeo, acceso a la demo y elección de vista", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Ver cómo funciona/ }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Probar la demo/ })
    .last()
    .click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(
    page.getByRole("heading", { name: "¿Cómo quieres verlo?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Soy el negocio/ }).click();
  await expect(page).toHaveURL(/vista=negocio/);
  await expect(
    page.getByRole("button", { name: "Vista negocio", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Vista cliente", exact: true })
    .click();
  await expect(page).toHaveURL(/vista=cliente/);
});
