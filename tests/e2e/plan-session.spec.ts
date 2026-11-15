import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

const authUrl = `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}`;

function signIn(page: Page) {
  return signInAs(page, "plan@example.com");
}

const sessionLinks = (page: Page) =>
  page.locator('a[href*="session="]').filter({ visible: true });

function lastMonday() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(new Date());
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) - 7);
  return date.toISOString().slice(0, 10);
}

test("an athlete records what they did", async ({ page }) => {
  const reset = await fetch(`${authUrl}/__test__/plan-matches`, {
    method: "DELETE",
  });
  expect(reset.ok).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  const monday = lastMonday();
  const strengthDay = new Date(`${monday}T00:00:00Z`);
  strengthDay.setUTCDate(strengthDay.getUTCDate() + 4);
  await page.goto(
    `/plan?week=${monday}&session=s-${strengthDay.toISOString().slice(0, 10)}-1`,
  );
  await expect(
    page.getByRole("dialog").getByRole("heading", { level: 2 }),
  ).toHaveText("Renfo haut du corps", { timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "C’est fait", exact: true }),
  ).toHaveCount(0);

  await page.goto(`/plan?week=${monday}&session=s-${monday}-1`);
  const panel = page.getByRole("dialog");
  await expect(panel.getByRole("heading", { level: 2 })).toHaveText(
    "Mobilité et marche",
    { timeout: 20_000 },
  );
  const tile = sessionLinks(page).filter({ hasText: /Mobilité et marche/ });
  await expect(tile).not.toContainText("Fait");
  await panel.getByRole("button", { name: "C’est fait", exact: true }).click();
  await expect(page.getByText("Séance notée comme faite")).toBeVisible();
  await expect(panel.getByText("Fait · noté par toi")).toBeVisible();
  await expect(tile).toContainText("Fait");

  await panel.getByRole("button", { name: "Annuler « C’est fait »" }).click();
  await expect(page.getByText("C’est fait annulé")).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "C’est fait", exact: true }),
  ).toBeVisible();
  await expect(panel.getByText("Fait · noté par toi")).toHaveCount(0);
  await expect(tile).not.toContainText("Fait");

  const activityId = "aaaaaaaa-aaaa-4aaa-8aaa-000000005002";
  const feelingReset = await fetch(
    `${authUrl}/__test__/activity-feelings?activity=${activityId}`,
    { method: "DELETE" },
  );
  expect(feelingReset.ok).toBe(true);
  await page.goto(`/activities/${activityId}`);
  const section = page.getByRole("region", { name: "Séance du plan" });
  await expect(section).toBeVisible({ timeout: 20_000 });
  await expect(section.getByText("Seuil · écourtée")).toBeVisible();
  await section.getByRole("link", { name: "Voir dans le plan" }).click();

  await expect(panel.getByRole("heading", { level: 2 })).toContainText(
    "Seuil",
    { timeout: 20_000 },
  );
  await expect(
    panel.getByText(/10 tours alignés sur les 10 étapes$/),
  ).toBeVisible();
  const steps = panel.getByRole("region", { name: "Étape par étape" });
  await expect(steps.getByText("Seuil 1", { exact: true })).toBeVisible();
  await expect(
    steps.getByRole("listitem").filter({ hasText: "Seuil 4" }),
  ).toContainText("Écourtée");

  const feeling = panel.getByRole("region", { name: "Ton ressenti" });
  await feeling
    .getByRole("radiogroup", { name: "Effort perçu, de 1 à 10" })
    .getByRole("radio", { name: "7" })
    .click();
  await feeling
    .getByRole("radiogroup", { name: "Sensations" })
    .getByRole("radio", { name: "Bien", exact: true })
    .click();
  await expect(page.getByText("Ressenti enregistré.")).toBeVisible();
  await expect(panel.getByText("Noté par toi")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Modifier" })).toBeVisible();

  await panel.getByRole("link", { name: "En parler au coach" }).click();
  await expect(page).toHaveURL(/\/coach\?session=s-/, {
    timeout: 20_000,
  });
  await expect(
    page.getByRole("button", { name: /^Retirer Seuil .* du contexte$/ }),
  ).toBeVisible();
});
