import { expect, test, type Page } from "@playwright/test";
import { clickToUrl } from "./support/navigation";
import { signInAs } from "./support/session";

function signIn(page: Page) {
  return signInAs(page, "athlete@example.com");
}

test("an athlete reads their form, recovery and records", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.goto("/activities");
  await page.getByRole("link", { name: "Santé", exact: true }).click();
  await expect(page).toHaveURL("/health/fitness");
  await expect(
    page.getByRole("region", { name: "EcoTrail Paris 120K" }).getByRole("link"),
  ).toHaveAttribute("href", "/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  const periods = page.getByRole("navigation", { name: "Période" });
  await periods.getByRole("link", { name: "12 sem." }).click();
  await expect(page).toHaveURL("/health/fitness?period=12w");
  await expect(periods.getByRole("link", { name: "12 sem." })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const tabs = page
    .getByRole("navigation", { name: "Sections de Santé" })
    .filter({ visible: true });
  await clickToUrl(
    page,
    tabs.getByRole("link", { name: "Récupération" }),
    /\/health\/recovery\?period=12w$/,
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Une courte nuit pèse sur ta forme du jour.",
    }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Échelle" })
    .getByRole("link", { name: "30 jours" })
    .click();
  await expect(page).toHaveURL(/\/health\/recovery\?.*view=month/);
  await expect(
    page
      .getByRole("region", { name: "Sommeil" })
      .getByRole("group", { name: /Durée et phases de sommeil des 30/ }),
  ).toBeVisible();

  await page.goto("/health/recovery?view=day&date=2026-10-10");
  await expect(
    page.getByRole("heading", { name: "Nuit courte, journée chargée." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Jour suivant" }).click();
  await expect(page).toHaveURL("/health/recovery?view=day&date=2026-10-11");

  await clickToUrl(
    page,
    tabs.getByRole("link", { name: "Records" }),
    /\/health\/records(\?.*)?$/,
  );
  const markers = page.getByRole("region", { name: "Tes repères actuels" });
  await expect(markers.getByText("4:38")).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Vitesse" })
      .getByText("prévision 3:33:40"),
  ).toBeVisible();
});

test("athlete records how they feel today", async ({ page }) => {
  await signIn(page);
  await page.goto("/health/recovery");
  const checkin = page.getByRole("region", { name: "Ton ressenti" });
  await expect(checkin.getByText("À saisir ce matin")).toBeVisible();
  const legs = checkin.getByRole("radiogroup", { name: "Jambes" });
  await legs.getByRole("radio", { name: "Fraîches" }).click();
  await expect(legs.getByRole("radio", { name: "Fraîches" })).toBeChecked();
  await expect(
    checkin.getByText(/^ce matin · enregistré à \d{2}:\d{2}$/),
  ).toBeVisible();
  await checkin
    .getByRole("radiogroup", { name: "Stress hors sport" })
    .getByRole("radio", { name: "Élevé" })
    .click();
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "Ton ressenti" })
      .getByRole("radiogroup", { name: "Jambes" })
      .getByRole("radio", { name: "Fraîches" }),
  ).toBeChecked();
  await expect(
    page.getByText("Tu as noté des jambes fraîches.").filter({ visible: true }),
  ).toBeVisible();
});
