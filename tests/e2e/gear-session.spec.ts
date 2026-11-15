import { expect, test, type Page } from "@playwright/test";
import { clickUntil } from "./support/navigation";
import { signInAs } from "./support/session";

test.describe.configure({ mode: "default" });

const authUrl = `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}`;

function signIn(page: Page) {
  return signInAs(page, "plan@example.com");
}

const sessionLinks = (page: Page) =>
  page.locator('a[href*="session="]').filter({ visible: true });

test("a planned session shows its pair and keeps the athlete's choice", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1020 });
  await signIn(page);
  await page.goto("/plan");
  await sessionLinks(page).filter({ hasText: /Seuil/ }).first().click();
  const panel = page.getByRole("dialog");
  const shoes = panel.getByRole("region", { name: "Chaussures" });
  await expect(shoes).toBeVisible({ timeout: 20_000 });
  await expect(
    shoes.getByRole("link", { name: /Saucony Endorphin Speed 4/ }),
  ).toBeVisible();
  await expect(shoes.getByText("Conseillée", { exact: true })).toBeVisible();
  await expect(shoes.getByText(/^Seuil sur route : /)).toBeVisible();

  const url = page.url();
  await shoes
    .getByRole("button", { name: "Choisir l’Adizero Evo SL 3" })
    .click();
  await expect(shoes.getByText("Ton choix", { exact: true })).toBeVisible();
  await expect(
    shoes.getByRole("link", { name: /Adidas Adizero Evo SL 3/ }),
  ).toBeVisible();
  await page.goto(url);
  const reloaded = page
    .getByRole("dialog")
    .getByRole("region", { name: "Chaussures" });
  await expect(reloaded.getByText("Ton choix", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    reloaded.getByText(/Stride conseillait l’Endorphin Speed 4/),
  ).toBeVisible();

  await reloaded
    .getByRole("button", { name: "Choisir l’Endorphin Speed 4" })
    .click();
  await expect(reloaded.getByText("Conseillée", { exact: true })).toBeVisible();
});

test("a run with another pair in Garmin asks which one was worn", async ({
  page,
}) => {
  const reset = await fetch(
    `${authUrl}/__test__/activity-feelings?activity=aaaaaaaa-aaaa-4aaa-8aaa-000000005000`,
    { method: "DELETE" },
  );
  expect(reset.ok).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const latest = page.getByRole("region", { name: "À faire" });
  await expect(
    page.getByRole("group", { name: /^Garmin indique les Zegama/ }),
  ).toHaveCount(0);
  await clickUntil(
    latest
      .getByRole("radiogroup", {
        name: "Comment c’était ? Effort perçu, de 1 à 10",
      })
      .getByRole("radio", { name: "4" }),
    () =>
      expect(
        latest.getByRole("radiogroup", { name: "Sensations" }),
      ).toBeVisible({ timeout: 2_000 }),
  );
  await latest
    .getByRole("radiogroup", { name: "Sensations" })
    .getByRole("radio", { name: "Bien", exact: true })
    .click();
  await expect(page.getByText("Ressenti enregistré.")).toBeVisible();
  const card = page.getByRole("group", {
    name: "Garmin indique les Zegama, la séance prévoyait les Adizero Evo SL 3.",
  });
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(
    card.getByText("Ta réponse corrige aussi la paire dans Garmin."),
  ).toBeVisible();

  await page.goto("/activities/gear");
  const watch = page.getByRole("region", { name: "À surveiller" });
  await expect(watch.getByText(/^Paire à confirmer · /)).toBeVisible();
  await watch.getByRole("link", { name: "Répondre" }).click();
  await expect(page).toHaveURL(
    /\/activities\/aaaaaaaa-aaaa-4aaa-8aaa-000000005000/,
  );
  const shoes = page.getByRole("region", { name: "Chaussures" });
  await expect(shoes.getByText("Nike Zegama")).toBeVisible();
  await expect(shoes.getByText("· Garmin", { exact: true })).toBeVisible();

  await page
    .getByRole("group", { name: /^Garmin indique les Zegama/ })
    .getByRole("button", { name: "Oui, les Zegama" })
    .click();
  await expect(shoes.getByText("· confirmée par toi")).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("group", { name: /^Garmin indique les Zegama/ }),
  ).toHaveCount(0);
  await page.goto("/today");
  await expect(
    page.getByRole("region", { name: "Séance du jour" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: /^Garmin indique les Zegama/ }),
  ).toHaveCount(0);
});
