import { chromium, type FullConfig } from "@playwright/test";

const developmentRoutes = [
  "/sign-up",
  "/activities",
  "/health/fitness",
  "/design-system",
  "/design-system/shell",
];

const productionRoutes = [
  "/plan",
  "/plan/history",
  "/activities",
  "/health/fitness",
  "/coach",
];

const compileTimeoutMs = 180_000;
const productionTimeoutMs = 60_000;

export default async function warmUpDevelopmentServer(config: FullConfig) {
  if (!process.env.CI || process.env.PLAYWRIGHT_REUSE_APP === "true") return;
  const production = process.env.PLAYWRIGHT_PRODUCTION === "true";
  const routes = production ? productionRoutes : developmentRoutes;
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    page.setDefaultTimeout(production ? productionTimeoutMs : compileTimeoutMs);
    await page.goto("/sign-in");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill(production ? "plan@example.com" : "athlete@example.com");
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill("TrailMiles2026!");
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await page.waitForURL("**/today");
    for (const route of routes)
      await page.goto(route, { waitUntil: "load" }).catch(() => undefined);
  } catch (error) {
    if (!production) throw error;
  } finally {
    await browser.close();
  }
}
