import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page) {
  return signInAs(page, "plan@example.com");
}

const sessionPanelLinks = (page: Page) =>
  page.locator('a[href^="/plan/sessions/"]').filter({ visible: true });

const todaySession = (page: Page) =>
  page.getByRole("region", { name: "Séance du jour", includeHidden: true });

test("a session opens over Today and closes back to it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const link = sessionPanelLinks(page).first();
  test.skip((await link.count()) === 0, "No session linked from Today");
  const href = await link.getAttribute("href");
  await link.focus();
  await page.evaluate(() => window.scrollTo(0, 120));
  const scroll = await page.evaluate(() => window.scrollY);
  await link.click();

  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(href ?? "");
  await expect(panel.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(todaySession(page)).toBeAttached();
  const navLink = (name: string) =>
    page
      .getByRole("link", { name, exact: true, includeHidden: true })
      .filter({ visible: true });
  await expect(navLink("Aujourd’hui")).toHaveAttribute("aria-current", "page");
  await expect(
    navLink("Plan").and(page.locator('[aria-current="page"]')),
  ).toHaveCount(0);
  await page.screenshot({ path: "test-results/session-panel-today.png" });

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/today$/);
  await expect(link).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(scroll);

  await link.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  const first = page.url();
  const position = page
    .getByRole("dialog")
    .getByText(/^Séance \d+ \/ \d+ de la semaine/);
  const before = await position.textContent();
  const next = page.getByRole("button", { name: "Séance suivante" });
  const previous = page.getByRole("button", { name: "Séance précédente" });
  const step = (await next.isEnabled()) ? next : previous;
  await step.click();
  await expect(page).not.toHaveURL(first);
  await expect(page).toHaveURL(/\/plan\/sessions\//);
  await expect(position).not.toHaveText(before ?? "");
  await expect(todaySession(page)).toBeAttached();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/today$/);
  await expect(link).toBeFocused();

  await link.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/today$/);
});

test("an unknown session opens Plan without a panel", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.evaluate(() =>
    (
      window as unknown as {
        next: { router: { push: (href: string) => void } };
      }
    ).next.router.push("/plan/sessions/s-2000-01-01-1"),
  );
  await expect(page).toHaveURL(/\/plan\?session=s-2000-01-01-1$/, {
    timeout: 20_000,
  });
  await expect(
    page.getByRole("heading", { level: 1, name: /Marathon de Paris$/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a session opens over Récupération", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/health/recovery");
  await expect(page.getByRole("region", { name: "Forme du jour" })).toBeVisible(
    { timeout: 20_000 },
  );
  const link = page.getByRole("link", { name: "Voir la séance" });
  test.skip((await link.count()) === 0, "No session today");
  await link.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/plan\/sessions\//);
  await expect(page.locator("main h1")).toBeAttached();
  await page.getByRole("button", { name: "Fermer" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/health\/recovery$/);
  await expect(link).toBeFocused();
});

test("a session loaded directly opens in Plan", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const href = await sessionPanelLinks(page).first().getAttribute("href");
  test.skip(href === null, "No session linked from Today");
  const key = decodeURIComponent(href!.split("/").pop() ?? "");
  await page.goto(href!);
  await expect(page).toHaveURL(
    new RegExp(`/plan\\?session=${encodeURIComponent(key)}$`),
  );
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/plan$/);
});

test("a pair chosen in the panel updates Today underneath", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await expect(todaySession(page)).toBeAttached();
  const chip = todaySession(page)
    .getByRole("link", {
      name: /^Paire (conseillée|choisie) : /,
      includeHidden: true,
    })
    .filter({ visible: true });
  test.skip((await chip.count()) === 0, "No running session today");
  const original = (await chip.textContent())?.trim() ?? "";
  await chip.click();
  const shoes = page
    .getByRole("dialog")
    .getByRole("region", { name: "Chaussures" });
  await expect(shoes).toBeVisible({ timeout: 20_000 });
  const choose = shoes.getByRole("button", { name: /^Choisir (l’|la )/ });
  const label = (await choose.first().getAttribute("aria-label")) ?? "";
  const name = label.replace(/^Choisir (l’|la )/, "");
  await choose.first().click();
  await expect(shoes.getByText("Ton choix", { exact: true })).toBeVisible();
  await expect(chip).toHaveAttribute("aria-label", `Paire choisie : ${name}`);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/today$/);
  await expect(chip).toHaveAttribute("aria-label", `Paire choisie : ${name}`);

  await chip.click();
  await expect(shoes).toBeVisible({ timeout: 20_000 });
  await shoes
    .getByRole("button", { name: new RegExp(`^Choisir (l’|la )${original}$`) })
    .click();
  await expect(chip).toHaveAttribute(
    "aria-label",
    new RegExp(`^Paire (conseillée|choisie) : ${original}$`),
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a link inside the panel leaves it for the target page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const link = sessionPanelLinks(page).first();
  test.skip((await link.count()) === 0, "No session linked from Today");
  await link.click();
  const shoes = page
    .getByRole("dialog")
    .getByRole("region", { name: "Chaussures" });
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  test.skip((await shoes.count()) === 0, "No pair for this session");
  await shoes.getByRole("link", { name: /Matériel/ }).click();
  await expect(page).toHaveURL(/\/activities\/gear$/, { timeout: 20_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
