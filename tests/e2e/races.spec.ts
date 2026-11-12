import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page) {
  return signInAs(page, "athlete@example.com");
}

test("signed-out visitors cannot open the race workspace", async ({ page }) => {
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await expect(page).toHaveURL(/\/sign-in$/);
});

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`race without GPX stays navigable at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await signIn(page);
    await page.goto("/races");
    await expect(
      page.getByRole("heading", { level: 1, name: "Courses" }),
    ).toBeVisible();
    const demands = page.getByRole("region", {
      name: "Où tu en es → ce que la course demande",
    });
    await expect(demands.getByRole("listitem")).toHaveText([
      /^Sortie la plus longue/,
      /^Dénivelé \/ semaine/,
      /^Volume \/ semaine/,
    ]);
    if (viewport.width >= 1024)
      await expect(
        page.getByText("Objectif de la saison", { exact: true }),
      ).toBeVisible();
    await page.getByRole("link", { name: "Voir le plan de course" }).click();
    await expect(page).toHaveURL(
      /\/races\/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb$/,
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "EcoTrail Paris 120K" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ajoute le GPX de la course" }),
    ).toBeVisible();
    await page.screenshot({
      path: `test-results/race-no-gpx-${viewport.width}.png`,
      fullPage: true,
    });
    const sections = page.getByRole("navigation", {
      name: "Sections de la course",
    });
    await expect(sections.getByRole("link")).toHaveText([
      "Plan de course",
      "Ravitaillement",
      "Équipement",
      "Préparation",
    ]);
    const views = page
      .getByRole("navigation", { name: "Vues du plan de course" })
      .filter({ visible: true });
    await expect(views.getByRole("link")).toHaveText([
      "Plan",
      "Côtes",
      "Scénarios",
    ]);
    await views.getByRole("link", { name: "Scénarios" }).click();
    await expect(page).toHaveURL(/\/scenarios$/);
    await expect(
      sections.getByRole("link", { name: "Plan de course" }),
    ).toHaveAttribute("aria-current", "page");
    await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/roadbook");
    await expect(page).toHaveURL(/\/scenarios$/);
    for (const label of ["Ravitaillement", "Équipement", "Préparation"]) {
      await sections.getByRole("link", { name: label }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "EcoTrail Paris 120K" }),
      ).toBeVisible();
    }
    await expect(
      page.getByRole("heading", { name: "Suis-je dans les temps ?" }),
    ).toBeVisible();
    await sections.getByRole("link", { name: "Équipement" }).click();
    await expect(
      sections.getByRole("link", { name: "Équipement" }),
    ).toHaveAttribute("aria-current", "page");
    for (const list of ["J-7", "J-1", "Jour J"])
      await expect(page.getByText(list, { exact: true }).first()).toBeVisible();
  });
}

for (const viewport of [
  { width: 1440, height: 900, name: "Trail des Crêtes" },
  { width: 390, height: 844, name: "Cross des Lilas" },
]) {
  test(`a race is added, edited and removed from Courses at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await signIn(page);
    await page.goto("/races");
    await page
      .getByRole("link", { name: "Ajouter une course", exact: true })
      .click();
    await expect(page).toHaveURL(/\/races\/new$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Quelle course ?" }),
    ).toBeVisible();
    await page.getByLabel("Nom", { exact: true }).fill(viewport.name);
    await page.getByLabel("Date", { exact: true }).fill("10/08/2027");
    await page.getByLabel("Distance", { exact: true }).fill("21,1");
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Qu’en attends-tu ?" }),
    ).toBeVisible();
    await page.getByText("C · Course de préparation").click();
    await expect(
      page.getByRole("radio", { name: /C · Course de préparation/ }),
    ).toBeChecked();
    await page
      .getByRole("button", { name: "Voir l’effet sur le plan" })
      .click();
    await expect(
      page.getByText("Course ajoutée à tes objectifs."),
    ).toBeVisible();
    await page.getByRole("link", { name: "Voir la course" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: viewport.name }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Modifier l’objectif" })
      .filter({ visible: true })
      .click();
    await expect(page).toHaveURL(/\/races\/[0-9a-f-]+\/edit$/);
    await expect(page.getByLabel("Nom", { exact: true })).toHaveValue(
      viewport.name,
    );
    await page.getByLabel("Nom", { exact: true }).fill(`${viewport.name} 2027`);
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(
      page.getByRole("radio", { name: /C · Course de préparation/ }),
    ).toBeChecked();
    await page
      .getByRole("button", { name: "Voir l’effet sur le plan" })
      .click();
    await expect(page.getByText("Course mise à jour.")).toBeVisible();
    await page.getByRole("link", { name: "Voir la course" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: `${viewport.name} 2027` }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Modifier l’objectif" })
      .filter({ visible: true })
      .click();
    await page.getByRole("button", { name: "Supprimer la course" }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Supprimer la course" })
      .click();
    await expect(page).toHaveURL(/\/races$/);
    await expect(page.getByText("Course supprimée.")).toBeVisible();
    await expect(page.getByText(`${viewport.name} 2027`)).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
