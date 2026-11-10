import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page, email = "athlete@example.com") {
  return signInAs(page, email);
}

test("the nutrition page shows today's targets and the next seven days", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/health/fitness");
  await page.getByRole("link", { name: "Nutrition", exact: true }).click();
  await expect(page).toHaveURL(/\/nutrition$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^Environ [\d  ]+ kcal aujourd’hui\.$/,
    }),
  ).toBeVisible();
  const targets = page.getByRole("region", { name: "Objectifs du jour" });
  for (const label of ["Énergie", "Glucides", "Protéines", "Lipides"])
    await expect(targets.getByText(label, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Sources des chiffres" }),
  ).toContainText("Poids");
  const timeline = page.getByRole("region", { name: /^Ta journée/ });
  await expect(timeline.getByRole("listitem").first()).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Ta base de ravito" }),
  ).toBeVisible();
  await expect(
    page.getByText("Teste ton ravito", { exact: true }),
  ).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(8);
  await expect(table.locator('tr[aria-current="date"]')).toHaveCount(1);
  await expect(
    table.getByRole("columnheader", { name: "Ravito" }),
  ).toBeVisible();
  await expect(
    page.getByText("Comment on calcule", { exact: true }),
  ).toBeVisible();
  const coach = page.getByRole("link", {
    name: "Demander à Léa pour cette journée",
  });
  const href = await coach.first().getAttribute("href");
  const url = new URL(href ?? "", "http://stride.test");
  expect(url.pathname).toBe("/coach/new");
  expect(url.searchParams.get("text")).toMatch(/^Nutrition du /);
  await page.screenshot({
    path: "test-results/nutrition-1440.png",
    fullPage: true,
  });
});

test("the nutrition page fits a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/nutrition");
  await expect(
    page.getByRole("heading", { level: 1, name: /kcal aujourd’hui\.$/ }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toBeHidden();
  const days = page.getByRole("region", { name: "Les 7 prochains jours" });
  await expect(days.getByText(/^Prot\. /).first()).toBeVisible();
  await expect(days.getByText(/^Gluc\. /).first()).toBeVisible();
  await expect(
    page
      .getByRole("link", { name: "Demander à Léa pour cette journée" })
      .last(),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/nutrition-390.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the team shows every specialist with a face choice", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/coach/team");
  for (const name of ["Inès", "Marc", "Hugo", "Léa"])
    await expect(
      page.getByRole("heading", { level: 3, name, exact: true }),
    ).toBeVisible();
  for (const role of [
    "Directeur sportif",
    "Stratège de course",
    "Nutritionniste",
  ])
    await expect(page.getByText(role, { exact: true }).first()).toBeVisible();
});
