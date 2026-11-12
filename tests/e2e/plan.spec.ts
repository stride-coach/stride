import { expect, test, type Locator, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page, email = "athlete@example.com") {
  return signInAs(page, email);
}

async function tabTo(page: Page, target: Locator) {
  for (let index = 0; index < 80; index++) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement))
      return;
  }
  throw new Error("Target never received focus");
}

const outline = (target: Locator, pseudo: string | null = null) =>
  target.evaluate(
    (element, pseudoElement) =>
      getComputedStyle(element, pseudoElement).outlineStyle,
    pseudo,
  );

test("signed-out athletes are sent to sign-in", async ({ page }) => {
  await page.goto("/plan");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("the plan shows the stored program with the current week selected", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/activities");
  await page.getByRole("link", { name: "Plan", exact: true }).first().click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^J-\d+ · Marathon de Paris$/,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/^Semaine 2 sur \d+ · Reconstruction$/),
  ).toBeVisible();
  await expect(page.getByText("Brouillon", { exact: true })).toHaveCount(0);
  for (const label of [
    "Course",
    "Total prévu",
    "Plus longue sortie",
    "Semaine de pic",
  ])
    await expect(page.getByText(label, { exact: true })).toBeVisible();

  await expect(
    page.getByRole("button", {
      name: /^Saison : Marathon de Paris, S2 \/ \d+$/,
    }),
  ).toBeVisible();
  const races = page.getByRole("region", { name: "Courses de la saison" });
  await expect(races.getByRole("listitem")).toHaveText([
    /^S8\s*10K Vincennes\s*Course C · cible 44:30/,
    /Marathon de Paris\s*Course A/,
  ]);

  const chart = page.getByRole("group", {
    name: /^Volume hebdomadaire prévu sur \d+/,
  });
  await expect(chart).toBeVisible();
  const current = chart.getByRole("button", { name: /^Semaine 2, / });
  await expect(current).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { level: 2, name: /^S2 / }),
  ).toBeVisible();
  await expect(
    page.getByText("En cours").filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText(/ faites$/)).toBeVisible();
  await expect(
    page.getByText("Proposé").filter({ visible: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Repères du programme")).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: /^\d+ % du temps de course en facile, cible 80 %$/,
    }),
  ).toBeVisible();

  const sidebar = page.getByRole("link", { name: /^Programme complet/ });
  await expect(sidebar).toHaveAttribute("aria-current", "page");

  await page.screenshot({ path: "test-results/plan-program-desktop.png" });

  await chart.getByRole("button", { name: /^Semaine 1, / }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: /^S1 / }),
  ).toBeVisible();
  await expect(
    page.getByText(/^Fait/).filter({ visible: true }).first(),
  ).toBeVisible();

  await chart.getByRole("button", { name: /^Semaine 3, / }).click();
  await expect(page).toHaveURL(/\/plan\?week=\d{4}-\d{2}-\d{2}$/);
  await expect(
    page.getByRole("heading", { level: 2, name: /^S3 / }),
  ).toBeVisible();
  await expect(page.getByText(/^Semaine 3 sur \d+ · /)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(
    page.getByText(/^Semaine 2 sur \d+ · Reconstruction$/),
  ).toBeVisible();
  await expect(current).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("heading", { level: 2, name: /^S4 / }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aujourd’hui" }).click();
  await expect(current).toHaveAttribute("aria-pressed", "true");

  await page
    .locator('a[href*="session="]')
    .filter({ hasText: /Seuil/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/plan\?.*session=s-\d{4}-\d{2}-\d{2}-/);
  await expect(page.getByRole("dialog")).toContainText("Étapes");
  await expect(page.getByText("Brouillon", { exact: true })).toHaveCount(0);
});

const pastSeason = "12121212-0000-4000-8000-000000000009";

test("the header switches between the seasons of the plan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "seasons@example.com");
  await page.goto("/plan");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^J-\d+ · Marathon de Paris$/,
    }),
  ).toBeVisible();
  await expect(page.getByText(/^Semaine 1 sur \d+ · /)).toBeVisible();
  const trigger = page.getByRole("button", {
    name: /^Saison : Marathon de Paris, S1 \/ \d+$/,
  });
  await tabTo(page, trigger);
  expect(await outline(trigger)).not.toBe("none");
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Saisons" });
  await expect(menu.getByText("Saison en cours")).toBeVisible();
  await expect(menu.getByText("Passées")).toBeVisible();
  await expect(
    menu.getByRole("menuitemradio", { name: /Marathon de Paris/ }),
  ).toHaveAttribute("aria-checked", "true");
  const past = menu.getByRole("menuitemradio", {
    name: /Trail d’automne 25K.*Terminée/,
  });
  await expect(past).toHaveAttribute("aria-checked", "false");
  await expect(
    menu.getByRole("menuitem", { name: "Toutes les courses" }),
  ).toHaveAttribute("href", "/races");
  await page.keyboard.press("ArrowDown");
  await expect(past).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/plan\\?season=${pastSeason}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Trail d’automne 25K" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Saison : Trail d’automne 25K, Terminée",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Saison terminée · lecture seule", { exact: true }),
  ).toBeVisible();
  const weeks = page
    .getByRole("group", { name: /^Volume hebdomadaire/ })
    .getByRole("button");
  await expect(weeks).toHaveCount(1);
  await expect(weeks).toHaveAttribute("aria-pressed", "true");
  await expect(weeks).toHaveAccessibleName(/^Semaine 1, /);
  for (const label of ["Course", "Séances", "Volume couru"])
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aujourd’hui" })).toHaveCount(
    0,
  );
  await expect(
    page
      .getByRole("region", { name: "Saison suivante" })
      .getByRole("link", { name: /Marathon de Paris.*En cours · S1/ }),
  ).toHaveAttribute("href", "/plan");
  await page
    .getByRole("link", { name: "Revenir à la saison en cours" })
    .click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Marathon de Paris$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Revenir à la saison en cours" }),
  ).toHaveCount(0);
});

const archivedSeason = "plan-dddddddd-dddd-4ddd-8ddd-121212120001";

test("an archived plan opens read-only as a past season", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "seasons@example.com");
  await page.goto("/plan");
  await page
    .getByRole("button", { name: /^Saison : Marathon de Paris, S1 \/ \d+$/ })
    .click();
  const menu = page.getByRole("menu", { name: "Saisons" });
  const items = menu.getByRole("menuitemradio");
  await expect(items).toHaveCount(3);
  await expect(items.nth(1)).toHaveAccessibleName(/^Course A, Trail d’automne/);
  await expect(items.nth(2)).toHaveAccessibleName(
    /^Course A, Trail des Lacs 30K, .*Terminée$/,
  );
  await items.nth(2).click();
  await expect(page).toHaveURL(new RegExp(`/plan\\?season=${archivedSeason}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: "Trail des Lacs 30K" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saison : Trail des Lacs 30K, Terminée" }),
  ).toBeVisible();
  await expect(
    page.getByText("Saison terminée · lecture seule", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("group", { name: /^Volume hebdomadaire/ })
      .getByRole("button"),
  ).toHaveCount(6);
  await expect(
    page.getByRole("main").getByRole("link", { name: "Historique" }),
  ).toHaveCount(1);
  await expect(
    page
      .getByRole("navigation", { name: "Sections du plan" })
      .getByRole("link", { name: "Historique" }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByText(/proposé/i)).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Saison suivante" })
      .getByRole("link", { name: /Trail d’automne 25K/ }),
  ).toHaveAttribute("href", `/plan?season=${pastSeason}`);

  await page
    .locator('a[href*="session="]')
    .filter({ hasText: "Footing vallonné", visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(
    new RegExp(`season=${archivedSeason}&week=[\\d-]+&session=s-`),
  );
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Footing vallonné",
  );
  await expect(panel.getByText("Fait", { exact: true })).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Voir l’activité Garmin" }),
  ).toHaveAttribute("href", "/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000005200");
  await expect(panel.getByRole("region", { name: "Ton ressenti" })).toHaveCount(
    0,
  );
  await expect(panel.getByRole("button")).toHaveCount(3);
  await expect(
    panel.getByRole("link", { name: "En parler au coach" }),
  ).toHaveCount(0);
});

test("the seasons sheet switches season on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "seasons@example.com");
  await page.goto("/plan");
  const trigger = page.getByRole("button", {
    name: /^Saison : Marathon de Paris, S1 \/ \d+$/,
  });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "Saisons" });
  await expect(
    sheet.getByRole("link", { name: /Marathon de Paris/ }),
  ).toHaveAttribute("aria-current", "true");
  for (const link of await sheet.getByRole("link").all())
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await sheet.getByRole("link", { name: /Trail d’automne 25K/ }).click();
  await expect(page).toHaveURL(new RegExp(`/plan\\?season=${pastSeason}$`));
  await expect(sheet).toHaveCount(0);
  await expect(
    page.getByText("Saison terminée · lecture seule", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Saison : Trail d’automne 25K/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});

test("the whole program is copied as text for another AI", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/plan");
  await page.getByRole("button", { name: "Copier le programme" }).click();
  await expect(
    page.getByText("Programme copié", { exact: true }),
  ).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/^# Programme d’entraînement · /);
  expect(text).toMatch(/- \*\*Marathon de Paris\*\* · objectif principal · /);
  expect(text).toMatch(/- Du \d{2}\/\d{2}\/\d{4} au \d{2}\/\d{2}\/\d{4} · /);
  expect(text).toContain("## Structure en blocs");
  expect(text).toMatch(/### Semaine 1 · \d{2}\/\d{2}\/\d{4} → /);
  expect(text).toMatch(/#### [a-zé]+\. \d{2}\/\d{2}\/\d{4} · /);
  expect(text).toContain("- Déroulé :");
});

test("the program fits a phone and shows the selected week", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "plan@example.com");
  await page.goto("/plan");
  await expect(
    page.getByRole("heading", { level: 1, name: /Marathon de Paris$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: /^S2 / }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/plan-program-mobile.png",
    fullPage: true,
  });
  await page.goto("/plan?race=ffffffff-ffff-4fff-8fff-ffffffffffff");
  await expect(
    page.getByRole("heading", { level: 1, name: /Marathon de Paris$/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/plan-program-race-mobile.png",
    fullPage: true,
  });
  await page
    .locator('a[href*="session="]')
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/plan\?.*session=/);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("the program is reachable with the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/plan");
  const chart = page.getByRole("group", { name: /^Volume hebdomadaire/ });
  await chart.waitFor();
  await page.getByRole("heading", { level: 1 }).evaluate((element) => {
    element.setAttribute("tabindex", "-1");
    (element as HTMLElement).focus();
  });
  const first = chart.getByRole("button", { name: /^Semaine 1, / });
  await tabTo(page, first);
  expect(await outline(first)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { level: 2, name: /^S1 / }),
  ).toBeVisible();

  const milestone = page
    .getByRole("region", { name: "Repères du programme" })
    .getByRole("button")
    .first();
  await tabTo(page, milestone);
  expect(await outline(milestone)).not.toBe("none");
});

test("a race day opens its race page", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/plan");
  await page
    .getByRole("group", { name: /^Volume hebdomadaire/ })
    .getByRole("button", { name: /^Semaine \d+, / })
    .last()
    .click();
  const raceDay = page
    .locator(
      'a[data-session-key][href="/races/cccccccc-cccc-4ccc-8ccc-cccccccccccc"]',
    )
    .filter({ visible: true })
    .first();
  await expect(raceDay).toContainText("Marathon de Paris");
  await raceDay.click();
  await expect(page).toHaveURL(
    /\/races\/cccccccc-cccc-4ccc-8ccc-cccccccccccc$/,
    { timeout: 20_000 },
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("an unknown session leaves Plan without a panel", async ({ page }) => {
  await signIn(page, "plan@example.com");
  const response = await page.goto("/plan?session=s-2000-01-01-1");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: /Marathon de Paris$/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("the removed week page is not found and a session URL opens Plan", async ({
  page,
}) => {
  await signIn(page, "plan@example.com");
  expect((await page.goto("/plan/week"))?.status()).toBe(404);
  await page.goto("/plan/sessions/s-2000-01-01-1");
  await expect(page).toHaveURL(/\/plan\?session=s-2000-01-01-1$/);
  await expect(
    page.getByRole("heading", { level: 1, name: /Marathon de Paris$/ }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("an athlete without a stored plan is invited to ask the coach", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/plan");
  await expect(
    page.getByRole("heading", { level: 1, name: "Pas encore de programme" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Demande au Coach/).filter({ visible: true }),
  ).toBeVisible();
  await expect(page.getByText("Brouillon", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Programme complet" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Mes disponibilités" }),
  ).toHaveAttribute("href", "/settings/training");
});
