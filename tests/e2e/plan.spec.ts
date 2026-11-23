import { expect, test, type Page } from "@playwright/test";
import { clickToUrl, clickUntil } from "./support/navigation";
import { signInAs } from "./support/session";

const sessionLinks = (page: Page) =>
  page.locator('a[href*="session="]').filter({ visible: true });

test("an athlete browses the plan and opens its sessions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "plan@example.com");

  const todayLink = page
    .locator('main a[href^="/plan/sessions/"]')
    .filter({ visible: true })
    .first();
  await todayLink.click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/plan\/sessions\//);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/today$/);
  await expect(todayLink).toBeFocused();

  await clickToUrl(
    page,
    page.getByRole("link", { name: "Plan", exact: true }).first(),
    /\/plan$/,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^J-\d+ · Marathon de Paris$/,
    }),
  ).toBeVisible();
  const chart = page.getByRole("group", {
    name: /^Volume hebdomadaire prévu sur \d+/,
  });
  const current = chart.getByRole("button", { name: /^Semaine 2, / });
  await expect(current).toHaveAttribute("aria-pressed", "true");

  await chart.getByRole("button", { name: /^Semaine 3, / }).click();
  await expect(page).toHaveURL(/\/plan\?week=\d{4}-\d{2}-\d{2}$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /^Semaine 3 / }),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("heading", { level: 2, name: /^Semaine 4 / }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aujourd’hui" }).click();
  await expect(current).toHaveAttribute("aria-pressed", "true");

  const seuil = sessionLinks(page).filter({ hasText: /Seuil/ }).first();
  await seuil.click();
  await expect(page).toHaveURL(/\/plan\?.*session=s-/, { timeout: 20_000 });
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { level: 2 })).toContainText("Seuil");
  await expect(panel.getByText("Étapes")).toBeVisible();
  const position = panel.getByText(/^Séance \d+ \/ \d+ de la semaine/);
  const before = await position.textContent();
  await clickUntil(panel.getByRole("button", { name: "Séance suivante" }), () =>
    expect(position).not.toHaveText(before ?? "", { timeout: 2_000 }),
  );
  await clickUntil(
    panel.getByRole("button", { name: "Séance précédente" }),
    () => expect(position).toHaveText(before ?? "", { timeout: 2_000 }),
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/plan(\?week=[\d-]+)?$/);
  await expect(seuil).toBeFocused();

  await page
    .getByRole("navigation", { name: "Sections du plan" })
    .getByRole("link", { name: "Calendrier" })
    .click();
  await expect(page).toHaveURL(/\/plan\/calendar$/);
  const day = page
    .getByRole("grid")
    .getByRole("gridcell")
    .filter({ has: page.locator('a[href*="session="]') })
    .first();
  await day.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/plan\/calendar\?month=\d{4}-\d{2}&session=/);
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/plan\/calendar$/);
});

const pastSeason = "12121212-0000-4000-8000-000000000009";
const archivedSeason = "plan-dddddddd-dddd-4ddd-8ddd-121212120001";

test("an athlete reads past seasons without changing them", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "seasons@example.com");
  await page.goto("/plan");
  const menu = page.getByRole("menu", { name: "Saisons" });
  await clickUntil(
    page.getByRole("button", {
      name: /^Saison : Marathon de Paris, S1 \/ \d+$/,
    }),
    () => expect(menu).toBeVisible({ timeout: 2_000 }),
  );
  await clickToUrl(
    page,
    menu.getByRole("menuitemradio", { name: /Trail d’automne 25K.*Terminée/ }),
    new RegExp(`/plan\\?season=${pastSeason}$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Trail d’automne 25K" }),
  ).toBeVisible();
  await expect(
    page
      .getByText("Saison terminée · lecture seule", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Aujourd’hui" })).toHaveCount(
    0,
  );

  await clickUntil(
    page.getByRole("button", {
      name: "Saison : Trail d’automne 25K, Terminée",
    }),
    () => expect(menu).toBeVisible({ timeout: 2_000 }),
  );
  await clickToUrl(
    page,
    menu.getByRole("menuitemradio", { name: /Trail des Lacs 30K.*Terminée$/ }),
    new RegExp(`/plan\\?season=${archivedSeason}$`),
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Trail des Lacs 30K" }),
  ).toBeVisible();
  await sessionLinks(page)
    .filter({ hasText: "Footing vallonné" })
    .first()
    .click();
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Footing vallonné",
  );
  await expect(panel.getByText("Fait", { exact: true })).toBeVisible();
  await expect(panel.getByRole("region", { name: "Ton ressenti" })).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await page
    .getByRole("link", { name: "Revenir à la saison en cours" })
    .click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Marathon de Paris$/ }),
  ).toBeVisible();
});

test("an athlete reviews the plan history", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "plan-history@example.com");
  await page.goto("/plan");
  await page.getByRole("link", { name: "Historique", exact: true }).click();
  await expect(page).toHaveURL("/plan/history", { timeout: 20_000 });
  const applied = page.getByRole("article", { name: "Repos avancé à mardi" });
  await expect(applied.getByText("Appliquée", { exact: true })).toBeVisible();
  await expect(applied.getByText("v2 → v3")).toBeVisible();

  await page
    .getByRole("article", { name: "Raccourcir la séance" })
    .getByRole("link", { name: "Examiner" })
    .click();
  await expect(page).toHaveURL(/\/plan\?proposal=/, { timeout: 20_000 });
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/plan/history");

  await clickToUrl(
    page,
    page.getByRole("link", { name: /^Refusées · / }),
    "/plan/history?filter=rejected",
  );
  await expect(
    page.getByRole("article", { name: "Ajouter des côtes courtes" }),
  ).toBeVisible();
  await expect(applied).toHaveCount(0);
});

test("an athlete scrolls the week cards and opens a session on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, "plan@example.com");
  await page.goto("/plan");
  const week = page.getByRole("list", { name: "Séances de la semaine" });
  await expect(week.getByRole("listitem")).toHaveCount(7);
  const today = week.locator('[aria-current="date"]');
  await expect(today).toHaveCount(1);
  const box = await today.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await week.getByRole("link").filter({ hasText: /Seuil/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
});

test("an athlete moves a session to another day from the week menu", async ({
  page,
}) => {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "Europe/Paris",
  }).format(new Date());
  test.skip(
    weekday === "Sunday",
    "No other session is left to move on Sunday.",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "plan@example.com");
  await page.goto("/plan");
  const week = page.getByRole("list", { name: "Séances de la semaine" });
  const days = week.getByRole("listitem");
  await expect(days).toHaveCount(7);
  const handles = week.getByRole("button", { name: /^Déplacer « / });
  await expect(handles.last()).toBeVisible();
  const label = await handles.last().getAttribute("aria-label");
  const title = label?.match(/^Déplacer « (.+) »$/)?.[1] ?? "";
  expect(title).not.toBe("");
  const handle = days
    .filter({ has: page.getByRole("button", { name: label ?? "" }) })
    .first()
    .getByRole("button", { name: label ?? "" });

  const dayOfHandle = (name: string) =>
    days.evaluateAll(
      (items, name) =>
        items.findIndex((item) =>
          [...item.querySelectorAll("button")].some(
            (button) => button.getAttribute("aria-label") === name,
          ),
        ),
      name,
    );
  const origin = await dayOfHandle(label ?? "");

  const targetsRead = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      "next-action" in response.request().headers(),
  );
  await handle.click();
  await targetsRead;
  const menu = page.getByRole("menu");
  await expect(menu.getByText("Déplacer vers…")).toBeVisible();
  const subtitle = await menu
    .locator('[data-slot="dropdown-menu-label"] span')
    .last()
    .textContent();
  await expect(
    menu
      .getByRole("menuitem", { disabled: true })
      .filter({ hasText: "Jour indisponible dans ton profil" })
      .first(),
  ).toBeVisible();
  const free = menu.getByRole("menuitem", { disabled: false }).first();
  await expect(free).toBeVisible();
  const destination =
    (await free.locator("span").first().textContent())?.trim() ?? "";
  await free.click();
  await expect(
    page.getByText(`Séance déplacée : ${destination}.`),
  ).toBeVisible();
  await expect.poll(() => dayOfHandle(label ?? "")).not.toBe(origin);

  const moved = days
    .nth(await dayOfHandle(label ?? ""))
    .getByRole("button", { name: label ?? "" });
  const reread = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      "next-action" in response.request().headers(),
  );
  await moved.click();
  await reread;
  const back = page
    .getByRole("menuitem", { disabled: false })
    .filter({ hasText: (subtitle ?? "").split(" · ")[1] ?? "" })
    .first();
  await back.click();
  await expect(
    page.getByText(`Séance déplacée : ${(subtitle ?? "").split(" · ")[1]}.`),
  ).toBeVisible();
  await expect.poll(() => dayOfHandle(label ?? "")).toBe(origin);
});
