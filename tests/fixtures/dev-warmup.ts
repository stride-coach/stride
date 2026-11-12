import { chromium, type FullConfig } from "@playwright/test";

const routes = [
  "/today",
  "/activities",
  "/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004",
  "/races",
  "/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "/health/fitness",
  "/health/recovery",
  "/health/records",
  "/settings",
  "/settings/profile",
  "/design-system",
  "/design-system/shell",
];

const compileTimeoutMs = 180_000;

export default async function warmUpDevelopmentServer(config: FullConfig) {
  if (
    !process.env.CI ||
    process.env.PLAYWRIGHT_PRODUCTION === "true" ||
    process.env.PLAYWRIGHT_REUSE_APP === "true"
  )
    return;
  const baseURL = config.projects[0]?.use.baseURL;
  if (!baseURL) return;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ baseURL });
    page.setDefaultTimeout(compileTimeoutMs);
    await page.goto("/sign-in");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill("athlete@example.com");
    await page
      .getByLabel("Mot de passe", { exact: true })
      .fill("TrailMiles2026!");
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    await page.waitForURL("**/today");
    for (const route of routes)
      await page.goto(route, { waitUntil: "load" }).catch(() => undefined);
  } finally {
    await browser.close();
  }
}
