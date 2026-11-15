import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page) {
  return signInAs(page, "athlete@example.com");
}

test("an athlete browses, filters and searches activities", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 800 });
  await signIn(page);
  await page.goto("/activities");
  await expect(
    page.getByRole("heading", { level: 1, name: "Activités" }),
  ).toBeVisible();
  const list = page.getByRole("region", { name: "Liste des activités" });
  const filters = page.getByRole("navigation", { name: "Filtrer par sport" });
  await filters.getByRole("link", { name: /^Trail/ }).click();
  await expect(page).toHaveURL(/\/activities\?filter=trail$/);
  await expect(list.getByText("Renforcement")).toHaveCount(0);
  await page.getByRole("link", { name: /Trail · Trail 80K/ }).click();
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-000000000005\?filter=trail$/,
  );
  await expect(
    page
      .getByRole("article")
      .getByRole("heading", { level: 1, name: "Trail · Trail 80K" }),
  ).toBeVisible();
  const breadcrumb = page.getByRole("navigation", { name: "Fil d’Ariane" });
  await breadcrumb
    .getByRole("link", { name: "Activités", exact: true })
    .click();
  await expect(page).toHaveURL(/\/activities\?filter=trail$/);

  await filters.getByRole("link", { name: /^Tout/ }).click();
  await expect(page).toHaveURL(/\/activities$/);
  await expect(list.getByText("50 sur 75 activités")).toBeVisible();
  await page.getByRole("link", { name: "Charger les suivantes" }).click();
  await expect(page).toHaveURL(/\/activities\?limit=100$/);
  await expect(list.getByText("75 sur 75 activités")).toBeVisible();
  const target = list.getByRole("link", { name: /Course à pied/ }).nth(30);
  await target.scrollIntoViewIfNeeded();
  const before = await list.evaluate((element) => element.scrollTop);
  expect(before).toBeGreaterThan(500);
  await target.click();
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-[0-9a-f]{12}\?limit=100$/,
  );
  await expect(page.getByRole("article")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/activities\?limit=100$/);
  await expect
    .poll(() => list.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(before - 5);

  await page
    .getByRole("searchbox", { name: "Rechercher par nom" })
    .fill("THRESHOLD");
  await Promise.all([
    page.waitForURL(/q=THRESHOLD/),
    page.getByRole("button", { name: "Rechercher", exact: true }).click(),
  ]);
  expect(new URL(page.url()).searchParams.has("limit")).toBe(false);
  await expect(list).toContainText("1 sur 1 activités");
  await list.getByRole("link", { name: /Threshold/ }).click();
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-000000000004\?q=THRESHOLD$/,
  );
  await page
    .getByRole("radiogroup", { name: "Découpage" })
    .getByRole("radio", { name: /^Tours/ })
    .click();
  await expect(
    page.getByRole("table", { name: "Tours" }).getByRole("row"),
  ).toHaveCount(8);
  await breadcrumb
    .getByRole("link", { name: "Activités", exact: true })
    .click();
  await expect(page).toHaveURL(/\/activities\?q=THRESHOLD$/);
  await expect(
    page.getByRole("searchbox", { name: "Rechercher par nom" }),
  ).toHaveValue("THRESHOLD");
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
  const effort = card
    .getByRole("radiogroup", { name: "Effort perçu, de 1 à 10" })
    .getByRole("radio", { name: "6", exact: true });
  await expect(async () => {
    await effort.click();
    await expect(effort).toBeChecked({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
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
  await expect(page).toHaveURL(`/coach?activity=${activityId}`, {
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: /^Retirer Course à pied .*du contexte$/ }),
  ).toBeVisible();
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
