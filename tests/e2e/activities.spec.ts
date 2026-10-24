import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page) {
  return signInAs(page, "athlete@example.com");
}

async function expectNotFound(page: Page) {
  await expect(
    page.getByRole("heading", { level: 1, name: "Activité introuvable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voir mes activités" }),
  ).toHaveAttribute("href", "/activities");
  await expect(
    page
      .getByRole("button", { name: "Afficher ou masquer la barre latérale" })
      .filter({ visible: true }),
  ).toHaveCount(1);
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]'),
  ).not.toHaveCount(0);
}

test("signed-out athletes are sent to sign-in", async ({ page }) => {
  await page.goto("/activities");
  await expect(page).toHaveURL(/\/sign-in$/);
});

test("activities are grouped by week, filtered by sport through the URL and opened in place", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/activities");
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  const sidebar = page.locator('[data-sidebar="sidebar"]').first();
  await expect(
    sidebar.getByRole("link", { name: /A EcoTrail Paris 120K/ }),
  ).toBeVisible();
  await expect(sidebar.getByText(/Course A · J-\d+/)).toBeVisible();
  await expect(
    sidebar.getByRole("link", { name: "Activités" }),
  ).toHaveAttribute("aria-current", "page");
  const list = page.getByRole("region", { name: "Liste des activités" });
  const thisWeek = list.getByRole("heading", { level: 2 }).first();
  await expect(thisWeek).toContainText(/Cette semaine|Semaine dernière/);
  await expect(thisWeek).toContainText(/\d+ activités?/);
  await expect(thisWeek).toContainText("km");
  await expect(thisWeek).not.toContainText("Plan :");
  await expect(
    page.getByRole("heading", { level: 2, name: "Course à pied" }),
  ).toBeVisible();
  await expect(page.getByText("Tout vient de Garmin")).toBeVisible();
  await expect(list.getByText("Trail · Fontainebleau")).toBeVisible();
  await expect(list.getByText("Renforcement")).toBeVisible();
  await expect(list.getByText("Hors plan")).toHaveCount(0);
  await expect(
    list
      .getByRole("link", { name: /Course à pied/ })
      .first()
      .getByText("Ressenti à noter"),
  ).toBeVisible();

  const filters = page.getByRole("navigation", { name: "Filtrer par sport" });
  await expect(filters.getByRole("link")).toHaveText([
    "Tout75",
    "Course72",
    "Trail2",
    "Renfo1",
  ]);
  await filters.getByRole("link", { name: /^Trail/ }).click();
  await expect(page).toHaveURL(/\/activities\?filter=trail$/);
  await expect(filters.getByRole("link", { name: /^Trail/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(list.getByText("Renforcement")).toHaveCount(0);

  await page.getByRole("link", { name: /Trail · Trail 80K/ }).click();
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-000000000005\?filter=trail$/,
  );
  const detail = page.getByRole("article");
  await expect(
    detail.getByRole("heading", { level: 1, name: "Trail · Trail 80K" }),
  ).toBeVisible();
  await expect(detail.getByText("80,2")).toBeVisible();
  await expect(detail.getByText("11:15:00")).toBeVisible();
  await expect(detail.getByText("1 620")).toBeVisible();
  await expect(detail.getByText("FC moy.")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Trail · Trail 80K/ }),
  ).toHaveAttribute("aria-current", "true");

  await page.goto("/activities?filter=cycling");
  await expect(filters.getByRole("link", { name: /^Vélo/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(list).toContainText(
    "Aucune sortie vélo importée pour l’instant.",
  );
});

test("the selected preview expands and stays centered on a wide desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/activities");
  const article = page.getByRole("article");
  await expect(
    article.getByRole("heading", { level: 2, name: "Course à pied" }),
  ).toBeVisible();

  const referenceWidth = await article.evaluate((element) => {
    const parent = element.parentElement!;
    return Math.min(parent.clientWidth, 960);
  });
  await expect(article).toHaveJSProperty("offsetWidth", referenceWidth);
  await page.screenshot({
    path: "test-results/activity-preview-reference-desktop.png",
  });

  await page.setViewportSize({ width: 2560, height: 1440 });

  const geometry = await article.evaluate((element) => {
    const article = element.getBoundingClientRect();
    const pane = element.parentElement!.getBoundingClientRect();
    return {
      articleWidth: article.width,
      articleLeft: article.left,
      expectedLeft: pane.left + (pane.width - article.width) / 2,
    };
  });
  expect(geometry.articleWidth).toBe(1440);
  expect(Math.abs(geometry.articleLeft - geometry.expectedLeft)).toBeLessThan(
    1,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(2560);
  await page.screenshot({
    path: "test-results/activity-preview-wide-desktop.png",
  });
});

test("the list and the detail scroll independently inside a fixed-height shell", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await signIn(page);
  await page.goto("/activities");
  const list = page.getByRole("region", { name: "Liste des activités" });
  await expect(list.getByText("50 sur 75 activités")).toBeVisible();
  const fits = () =>
    page.evaluate(
      () =>
        document.documentElement.scrollHeight <= window.innerHeight &&
        document.documentElement.scrollTop === 0,
    );
  expect(await fits()).toBe(true);
  const breadcrumb = page.getByRole("navigation", { name: "Fil d’Ariane" });
  await expect(breadcrumb).toBeInViewport();
  const detail = page.getByRole("article").locator("xpath=..");
  const scrollable = await list.evaluate(
    (element) => element.scrollHeight - element.clientHeight,
  );
  expect(scrollable).toBeGreaterThan(1500);

  await list.evaluate((element) => {
    element.scrollTop = 1500;
  });
  await expect
    .poll(() => list.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(1400);
  expect(await detail.evaluate((element) => element.scrollTop)).toBe(0);
  expect(await fits()).toBe(true);
  await expect(breadcrumb).toBeInViewport();
  const stuck = await list.evaluate((element) => {
    const top = element.getBoundingClientRect().top;
    return Array.from(element.querySelectorAll("h2")).some(
      (heading) => Math.abs(heading.getBoundingClientRect().top - top) <= 1,
    );
  });
  expect(stuck).toBe(true);

  await page.getByRole("link", { name: "Charger les suivantes" }).click();
  await expect(page).toHaveURL(/\/activities\?limit=100$/);
  await expect(list.getByText("75 sur 75 activités")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Charger les suivantes" }),
  ).toHaveCount(0);
  expect(await list.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    1000,
  );
  const target = list.getByRole("link", { name: /Course à pied/ }).nth(30);
  await target.scrollIntoViewIfNeeded();
  const before = await list.evaluate((element) => element.scrollTop);
  await target.click();
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-[0-9a-f]{12}\?limit=100$/,
  );
  await expect(page.getByRole("article")).toBeVisible();
  await expect
    .poll(() => list.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(before - 5);
  expect(await list.evaluate((element) => element.scrollTop)).toBeLessThan(
    before + 5,
  );
  await expect(list.locator('[aria-current="true"]')).toBeInViewport();
});

test("the activity panel shows laps, effort and provenance, and the old detail URL redirects", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.goto(
    "/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004/details?filter=road",
  );
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-000000000004\?filter=road$/,
  );
  const article = page.getByRole("article");
  await expect(
    article.getByRole("heading", { level: 1, name: "Threshold 3 × 10 min" }),
  ).toBeVisible();
  await expect(
    article.getByRole("link", { name: /Détail complet/ }),
  ).toHaveCount(0);
  const metrics = article.locator("dl").first();
  for (const label of [
    "Distance",
    "Temps",
    "Allure",
    "D+",
    "FC moy.",
    "Puissance",
  ])
    await expect(metrics.getByText(label, { exact: true })).toBeVisible();
  await expect(metrics).toContainText("248");
  await expect(
    article.getByRole("region", { name: "Hors plan" }),
  ).toBeVisible();
  const table = page.getByRole("table", { name: "Tours" });
  await expect(table.getByRole("row")).toHaveCount(8);
  await expect(table.getByRole("columnheader", { name: "D−" })).toBeVisible();
  await expect(
    table.getByRole("columnheader", { name: "Puiss." }),
  ).toBeVisible();
  const rep = table.getByRole("row").nth(2);
  await expect(rep.getByRole("rowheader")).toHaveText("2");
  await expect(rep).toContainText("10:00");
  await expect(rep).toContainText("2,27");
  await expect(rep).toContainText("4:24");
  await expect(rep).toContainText("161");
  await expect(rep).toContainText("286");
  const effort = page.getByRole("region", { name: "Effort" });
  await expect(effort).toContainText("Effet aérobie");
  await expect(effort).toContainText("3,4");
  await expect(effort).toContainText("FC max");
  await expect(effort).toContainText("176");
  await expect(effort).toContainText("Puissance max");
  await expect(effort).toContainText("Sensations");
  await expect(effort).toContainText("Bien");
  await expect(effort.locator("dd:empty")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Temps dans les zones" }),
  ).toContainText("Estimation Stride");
  await expect(page.getByText("détail importé le 07/10/2026")).toBeVisible();
  await page.goto("/activities/cccccccc-cccc-4ccc-8ccc-cccccccccccc/details");
  await expectNotFound(page);
});

test("the activity panel says nothing about laps Garmin did not send and stays within 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await signIn(page);
  await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000001");
  await expect(page.getByRole("article")).toBeVisible();
  await expect(page.getByRole("table", { name: "Tours" })).toHaveCount(0);
  await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004");
  const table = page.getByRole("table", { name: "Tours" });
  await expect(table).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Cad." })).toBeHidden();
  await expect(
    table.getByRole("columnheader", { name: "D+/D−" }),
  ).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "W" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await table.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
});

test("an unplanned run takes a feeling and opens the coach with the activity attached", async ({
  page,
}) => {
  const activityId = "aaaaaaaa-aaaa-4aaa-8aaa-000000000001";
  const reset = await fetch(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/activity-feelings?activity=${activityId}`,
    { method: "DELETE" },
  );
  expect(reset.ok).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/activities/${activityId}`);
  const card = page.getByRole("region", { name: "Hors plan" });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText("Compte dans ta charge");
  await card
    .getByRole("radiogroup", { name: "Effort perçu, de 1 à 10" })
    .getByRole("radio", { name: "6", exact: true })
    .click();
  await card
    .getByRole("radiogroup", { name: "Sensations" })
    .getByRole("radio", { name: "Bien", exact: true })
    .click();
  await expect(page.getByText("Ressenti enregistré.")).toBeVisible();
  await expect(card).toContainText("Ressenti");
  await expect(card).toContainText("6/10");
  await expect(card.getByRole("button", { name: "Modifier" })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Liste des activités" })
      .getByRole("link", { name: /Course à pied/ })
      .first()
      .getByText("Ressenti à noter"),
  ).toHaveCount(0);

  await card.getByRole("link", { name: "En parler au coach" }).click();
  await expect(page).toHaveURL(`/coach/new?activity=${activityId}`, {
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: /^Retirer Course à pied .*du contexte$/ }),
  ).toBeVisible();
});

test("the chart shows any set of series and moves the map point with its cursor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("https://basemaps.cartocdn.com/**", (route) =>
    route.abort(),
  );
  await signIn(page);
  await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004");
  const data = page.getByRole("region", { name: "Parcours et données" });
  await expect(data.getByRole("img", { name: /Tracé GPS/ })).toBeVisible();
  const toggles = data.getByRole("toolbar", { name: "Données affichées" });
  const toggle = (name: string) =>
    toggles.getByRole("button", { name, exact: true });
  await expect(toggle("Allure")).toHaveAttribute("aria-pressed", "true");
  await expect(toggle("FC")).toHaveAttribute("aria-pressed", "true");
  await expect(toggle("Puissance")).toHaveAttribute("aria-pressed", "false");
  await expect(
    data.getByRole("img", { name: "Allure, FC selon le temps écoulé" }),
  ).toBeVisible();

  await toggle("Puissance").click();
  await toggle("Allure").click();
  await expect(toggle("Puissance")).toHaveAttribute("aria-pressed", "true");
  await expect(toggle("Allure")).toHaveAttribute("aria-pressed", "false");
  const chart = data.getByRole("img", {
    name: "FC, Puissance selon le temps écoulé",
  });
  await expect(chart).toBeVisible();
  await toggle("FC").click();
  await toggle("Puissance").click();
  await expect(toggle("Puissance")).toHaveAttribute("aria-pressed", "true");

  const map = data.locator("[data-marker]");
  await expect(map).toHaveCount(0);
  const plot = data.getByRole("img", {
    name: "Puissance selon le temps écoulé",
  });
  const box = await plot.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  const inspection = data.getByRole("group", { name: /^Inspecter/ });
  const status = inspection.getByRole("status");
  await expect(status).toContainText("W");
  await expect(status).toContainText("km");
  const middle = Number(await map.getAttribute("data-marker"));
  expect(middle).toBeGreaterThan(30);
  expect(middle).toBeLessThan(70);
  await page.mouse.move(box!.x + box!.width - 2, box!.y + box!.height / 2);
  await expect
    .poll(async () => Number(await map.getAttribute("data-marker")))
    .toBeGreaterThan(90);

  await inspection.focus();
  await inspection.press("Home");
  await expect(status).toContainText("0:00");
  await inspection.press("End");
  await expect(status).toContainText("58:40");
  await inspection.press("Escape");
  await expect(status).toHaveCount(0);
  await data.getByRole("button", { name: "Carte en plein écran" }).click();
  const fullscreen = page.getByRole("dialog", {
    name: "Carte plein écran · Parcours",
  });
  await expect(fullscreen).toBeVisible();
  expect((await fullscreen.boundingBox())?.width).toBe(1440);
  await page.keyboard.press("Escape");
  await expect(fullscreen).toHaveCount(0);
  await expect(
    data.getByRole("button", { name: "Carte en plein écran" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/activity-data-desktop.png" });
});

test("an activity already shown in the detail pane is not loaded again", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    const headers = request.headers();
    if (headers.rsc === "1" && !headers["next-router-prefetch"])
      requests.push(request.url());
  });

  await page.goto("/activities");
  const preview = page.locator('ul a[href^="/activities/"]').first();
  await expect(preview).toBeVisible();
  await preview.click();
  await expect(page).toHaveURL("/activities");

  await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000005");
  const selected = page.getByRole("link", { name: /Trail · Trail 80K/ });
  await expect(selected).toHaveAttribute("aria-current", "true");
  await selected.click();
  await expect(
    page
      .getByRole("article")
      .getByRole("heading", { level: 1, name: "Trail · Trail 80K" }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
});

test("an unknown or foreign activity is not found", async ({ page }) => {
  await signIn(page);
  for (const id of ["not-an-id", "cccccccc-cccc-4ccc-8ccc-cccccccccccc"]) {
    await page.goto(`/activities/${id}`);
    await expectNotFound(page);
  }
});

test("mobile shows the list, then the activity alone, without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/activities");
  await expect(page.getByRole("article")).toBeHidden();
  await page
    .getByRole("link", { name: /Course à pied/ })
    .first()
    .click();
  await expect(page.getByRole("article")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Activités" }),
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("link", { name: "Retour aux activités" }).click();
  await expect(page).toHaveURL(/\/activities$/);
  await page
    .getByRole("button", { name: "Afficher ou masquer la barre latérale" })
    .first()
    .click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: "Activités" }),
  ).toBeVisible();
});

test("samples without GPS keep the chart without running pace", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000003");
  const data = page.getByRole("region", { name: "Parcours et données" });
  await expect(
    data.getByText("Aucun tracé GPS n’est disponible pour cette activité."),
  ).toBeVisible();
  await expect(
    data.getByRole("img", { name: "FC selon le temps écoulé" }),
  ).toBeVisible();
  const toggles = data.getByRole("toolbar", { name: "Données affichées" });
  await expect(toggles.getByRole("button")).toHaveText(["FC"]);
  await expect(
    page.getByRole("radiogroup", { name: "Colorer le tracé par" }),
  ).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Chaussures" })).toHaveCount(0);
});

test("the bundled map worker renders a GPS route with map controls", async ({
  page,
}) => {
  await page.route("https://basemaps.cartocdn.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#080907" },
          },
        ],
      }),
    }),
  );
  await signIn(page);
  await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004");
  const data = page.getByRole("region", { name: "Parcours et données" });
  await expect(data.getByRole("button", { name: "Zoom avant" })).toBeVisible({
    timeout: 15000,
  });
  await data.getByRole("button", { name: "Zoom avant" }).click();
  await data.getByRole("button", { name: "Recentrer le tracé" }).click();
  await expect(data.locator("canvas")).toBeVisible();
  const modes = data.getByRole("radiogroup", { name: "Colorer le tracé par" });
  await modes.getByRole("radio", { name: "FC", exact: true }).click();
  await expect(
    modes.getByRole("radio", { name: "FC", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
});

test.describe("touch chart inspection", () => {
  test.use({ hasTouch: true, viewport: { width: 320, height: 844 } });
  test("keeps the chart annotation readable within a narrow screen", async ({
    page,
  }) => {
    await page.route("https://basemaps.cartocdn.com/**", (route) =>
      route.abort(),
    );
    await signIn(page);
    await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004");
    const data = page.getByRole("region", { name: "Parcours et données" });
    const plot = data.getByRole("img", { name: /selon le temps écoulé$/ });
    await plot.scrollIntoViewIfNeeded();
    for (const position of [0.05, 0.5, 0.95]) {
      const box = await plot.boundingBox();
      await page.touchscreen.tap(
        box!.x + box!.width * position,
        box!.y + box!.height / 2,
      );
      const annotation = data
        .getByRole("group", { name: /^Inspecter/ })
        .getByRole("status");
      await expect(annotation).toBeVisible();
      const bounds = await annotation.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
});

test("a planned run shows its plan pill in the list and its session in the panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "plan@example.com");
  await page.goto("/activities");
  const list = page.getByRole("region", { name: "Liste des activités" });
  await expect(
    list.getByText(/Plan : \d+ séances? sur \d+/).first(),
  ).toBeVisible();
  const planned = list
    .getByRole("link")
    .filter({ hasText: /Seuil 4 × 6’/ })
    .first();
  await expect(planned).toContainText(/Seuil · /);
  await expect(list.getByText("Hors plan").first()).toBeVisible();
  await planned.click();
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-000000005002$/,
  );
  await expect(
    page
      .getByRole("article")
      .getByRole("heading", { level: 1, name: /Seuil 4 × 6’/ }),
  ).toBeVisible({ timeout: 20_000 });
  const card = page.getByRole("region", { name: "Séance du plan" });
  await expect(card.getByText("Seuil · écourtée")).toBeVisible();
  await expect(
    card.getByRole("link", { name: "Voir dans le plan" }),
  ).toBeVisible();
  await expect(
    card.getByRole("link", { name: "En parler au coach" }),
  ).toHaveAttribute("href", /\/coach\/new\?session=s-/);
});

test("name search filters before pagination and keeps context through drill-down", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/activities?limit=100&filter=road");
  await page
    .getByRole("searchbox", { name: "Rechercher par nom" })
    .fill("THRESHOLD");
  await Promise.all([
    page.waitForURL(/q=THRESHOLD/),
    page.getByRole("button", { name: "Rechercher", exact: true }).click(),
  ]);
  expect(new URL(page.url()).searchParams.has("limit")).toBe(false);
  await expect(
    page.getByRole("region", { name: "Liste des activités" }),
  ).toContainText("1 sur 1 activités");
  await page
    .getByRole("region", { name: "Liste des activités" })
    .getByRole("link", { name: /Threshold/ })
    .click();
  await expect(page).toHaveURL(/\/activities\?filter=road&q=THRESHOLD$/);
  await expect(
    page.getByRole("article").getByRole("heading", { name: /Threshold/ }),
  ).toBeVisible();
  await page.goto(
    "/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004?filter=road&q=THRESHOLD",
  );
  const breadcrumb = page.getByRole("navigation", { name: "Fil d’Ariane" });
  await expect(
    breadcrumb.getByRole("link", { name: "Activités", exact: true }),
  ).toHaveAttribute("href", "/activities?filter=road&q=THRESHOLD");
  await breadcrumb
    .getByRole("link", { name: "Activités", exact: true })
    .click();
  const filters = page.getByRole("navigation", { name: "Filtrer par sport" });
  await expect(filters.getByRole("link")).toHaveText(["Tout1", "Course1"]);
  await filters.getByRole("link", { name: /^Tout/ }).click();
  await expect(page).toHaveURL(/\/activities\?q=THRESHOLD$/);
  await page.goto("/activities?filter=trail&q=THRESHOLD");
  await expect(filters.getByRole("link", { name: /^Trail/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page).toHaveURL(/filter=trail&q=THRESHOLD$/);
  await expect(
    page
      .getByRole("region", { name: "Liste des activités" })
      .getByText("Aucune activité ne correspond à ce nom."),
  ).toBeVisible();
  await expect(
    page.getByRole("searchbox", { name: "Rechercher par nom" }),
  ).toHaveValue("THRESHOLD");
});

test("name search treats wildcard and punctuation literally before pagination", async ({
  page,
}) => {
  test.slow();
  await signIn(page);
  for (const search of [
    "été",
    "%",
    "_",
    "\\",
    "*",
    "(soir), lac",
    "100%_effort",
    "absent",
    "%,activity_type.eq.running",
    "Fontainebleau",
    "**",
  ]) {
    await page.goto(`/activities?q=${encodeURIComponent(search)}`);
    const list = page.getByRole("region", { name: "Liste des activités" });
    if (
      ["absent", "%,activity_type.eq.running", "Fontainebleau", "**"].includes(
        search,
      )
    ) {
      await expect(list).toContainText(
        "Aucune activité ne correspond à ce nom.",
      );
    } else {
      await expect(list).toContainText("1 sur 1 activités");
      await expect(
        list.getByRole("link", { name: /Été 100%_effort/ }),
      ).toBeVisible();
    }
  }
  await page.goto("/activities?limit=100&q=%C3%89t%C3%A9");
  await expect(
    page
      .getByRole("region", { name: "Liste des activités" })
      .getByRole("link", { name: /Été/ }),
  ).toHaveAttribute("href", /limit=100&q=%C3%89t%C3%A9$/);
});

test("name search preserves query through load-more and selection", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/activities?filter=road&q=Course");
  const searchedList = page.getByRole("region", {
    name: "Liste des activités",
  });
  await expect(searchedList).toContainText("50 sur 69 activités");
  await searchedList
    .getByRole("link", { name: "Charger les suivantes" })
    .click();
  await expect(page).toHaveURL(/filter=road&limit=100&q=Course$/);
  await expect(searchedList).toContainText("69 sur 69 activités");
  await searchedList
    .getByRole("link", { name: /Course à pied/ })
    .last()
    .click();
  await expect(page).toHaveURL(/000000000169\?filter=road&limit=100&q=Course$/);
});

test("mobile list and GPS preview fit 390 and 320 pixels", async ({ page }) => {
  await page.route("https://basemaps.cartocdn.com/**", (route) =>
    route.abort(),
  );
  await signIn(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/activities");
    await expect(page.getByRole("article")).toBeHidden();
    await expect(
      page.getByRole("searchbox", { name: "Rechercher par nom" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/activities-list-${width}.png`,
    });
    await page.goto("/activities/aaaaaaaa-aaaa-4aaa-8aaa-000000000004");
    const article = page.getByRole("article");
    await expect(article).toBeVisible();
    await expect(
      article.getByRole("region", { name: "Parcours et données" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await article.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/activities-preview-${width}.png`,
    });
  }
});

test("a failed activities read stays in the app and recovers on retry", async ({
  page,
}) => {
  const endpoint = `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/rest-failure`;
  const match = "panne-fixture";
  await signIn(page);
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match }),
  });
  try {
    await page.goto("/activities?q=panne-fixture");
    const alert = page.getByRole("alert").filter({
      has: page.getByRole("heading", {
        name: "Cette page n’a pas pu se charger.",
      }),
    });
    await expect(alert).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Retour à Aujourd’hui" }),
    ).toBeVisible();
    await expect(
      page
        .locator("[data-sidebar=sidebar]")
        .getByRole("link", { name: /Activités/ }),
    ).toBeVisible();
  } finally {
    await fetch(`${endpoint}?match=${encodeURIComponent(match)}`, {
      method: "DELETE",
    });
  }
  await page.getByRole("button", { name: "Réessayer" }).click();
  await expect(
    page.getByRole("heading", { name: "Cette page n’a pas pu se charger." }),
  ).toHaveCount(0);
  await expect(
    page
      .getByText("Aucune activité ne correspond à ce nom.")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
});
