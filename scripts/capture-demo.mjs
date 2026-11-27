import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
const port = 3101;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    env: { ...process.env, DEMO_DB_PATH: "./data/screenshots.db" },
    windowsHide: true,
    stdio: "ignore",
  },
);
let browser;
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null)
      throw new Error(
        "No se pudo iniciar el servidor de capturas. Comprueba que el puerto 3101 esté libre.",
      );
    try {
      const r = await fetch(origin);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {
      /* El servidor todavía está arrancando. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready)
    throw new Error(
      "El servidor de capturas no respondió. Ejecuta npm run build antes.",
    );
  await fetch(`${origin}/api/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "reset", confirmation: "RESTABLECER" }),
  });
  await mkdir("docs/screenshots", { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1060 },
    deviceScaleFactor: 1,
  });
  await page.goto(`${origin}/demo?vista=negocio`);
  await page.getByRole("heading", { name: "Buenos días, equipo" }).waitFor();
  await page.screenshot({ path: "docs/screenshots/hoy.png" });
  await page
    .getByRole("button", { name: "Cómo va el negocio", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Lo que nos cuentan tus datos" })
    .waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/screenshots/negocio.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/demo?vista=cliente`);
  await page
    .getByRole("button", { name: "Reservar cita", exact: true })
    .waitFor();
  await page.screenshot({
    path: "docs/screenshots/whatsapp-movil.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Reservar cita", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "¿En qué podemos ayudarte?" })
    .waitFor();
  await page.screenshot({
    path: "docs/screenshots/reserva-movil.png",
    fullPage: true,
  });
  console.log(
    "Capturas guardadas en docs/screenshots. Solo contienen datos ficticios.",
  );
} finally {
  if (browser) await browser.close();
  server.kill();
}
