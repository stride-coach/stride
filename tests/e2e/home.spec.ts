import { expect, test } from "@playwright/test";

test("signed-out visitors land on the public page and reach legal pages", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL("/");
  await expect(page).toHaveTitle("Stride · Progresse sans te blesser");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /Un staff qui lit ton corps avant de décider ta séance/,
    }),
  ).toBeVisible();

  const legal = page.getByRole("navigation", { name: "Informations légales" });
  for (const [name, heading] of [
    ["Confidentialité", "Politique de confidentialité"],
    ["Conditions d’utilisation", "Conditions d’utilisation"],
    ["Mentions légales", "Mentions légales"],
  ] as const) {
    await legal.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page).toHaveTitle(`${heading} · Stride`);
  }
  await expect(
    page.getByRole("link", { name: "github.com/Julestblt" }),
  ).toBeVisible();

  await page
    .getByRole("banner")
    .getByRole("link", { name: "Stride, accueil" })
    .click();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Créer un compte" })
    .first()
    .click();
  await expect(page).toHaveURL("/sign-up");
});

test("Dense utilities and global accessibility defaults resolve in the browser", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    const surface = document.createElement("div");
    surface.id = "theme-probe";
    surface.className =
      "bg-card text-secondary-foreground rounded-lg border border-border";
    document.body.append(surface);
    const input = document.createElement("input");
    input.id = "state-probe";
    input.className =
      "bg-background text-foreground tabular-nums rounded-md border border-input";
    input.setAttribute("aria-invalid", "true");
    input.disabled = true;
    document.body.append(input);
    const raised = document.createElement("div");
    raised.id = "raised-probe";
    raised.className =
      "bg-muted text-muted-foreground outline-ring motion-safe:animate-pulse";
    document.body.append(raised);
  });
  const surface = page.locator("#theme-probe");
  await expect(surface).toHaveCSS("background-color", "rgb(18, 19, 22)");
  await expect(surface).toHaveCSS("color", "rgb(179, 182, 189)");
  await expect(surface).toHaveCSS("border-color", "rgb(30, 32, 37)");
  await expect(surface).toHaveCSS("border-radius", "9px");
  await expect(surface).toHaveCSS("font-size", "13px");
  await expect(surface).toHaveCSS("font-family", /Inter/);
  const input = page.locator("#state-probe");
  await expect(input).toHaveCSS("background-color", "rgb(12, 13, 15)");
  await expect(input).toHaveCSS("color", "rgb(237, 238, 240)");
  await expect(input).toHaveCSS("border-color", "rgb(240, 128, 106)");
  await expect(input).toHaveCSS("border-radius", "6px");
  await expect(input).toHaveCSS("font-variant-numeric", "tabular-nums");
  await expect(input).toHaveCSS("opacity", "0.5");
  const raised = page.locator("#raised-probe");
  await expect(raised).toHaveCSS("background-color", "rgb(24, 25, 29)");
  await expect(raised).toHaveCSS("color", "rgb(134, 138, 148)");
  await expect(raised).toHaveCSS("outline-color", "rgb(110, 155, 255)");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(raised).toHaveCSS("animation-name", "none");
});

test("deferred onboarding routes and sync endpoint remain unavailable", async ({
  request,
}) => {
  expect((await request.get("/onboarding")).status()).toBe(404);
  expect((await request.get("/onboarding/welcome")).status()).toBe(404);
  const sync = await request.get("/api/onboarding/sync");
  expect(sync.status()).toBe(404);
  expect(sync.headers()["cache-control"]).toContain("no-store");
});
