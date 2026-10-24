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
    await expect(
      page.getByRole("heading", { name: "Suis-je dans les temps ?" }),
    ).toBeVisible();
    await expect(
      page.getByText("pas de prévision fiable en ultra"),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ouvrir la course" }).click();
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
      "Course",
      "Plan de course",
      "Nutrition",
      "Équipement et check-lists",
    ]);
    for (const label of [
      "Plan de course",
      "Nutrition",
      "Équipement et check-lists",
    ]) {
      await sections.getByRole("link", { name: label }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "EcoTrail Paris 120K" }),
      ).toBeVisible();
    }
    await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/preparation");
    await expect(page).toHaveURL(
      /\/races\/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb\/gear$/,
    );
    await expect(
      sections.getByRole("link", { name: "Équipement et check-lists" }),
    ).toHaveAttribute("aria-current", "page");
    for (const list of ["J-7", "J-1", "Jour J"])
      await expect(page.getByText(list, { exact: true }).first()).toBeVisible();
  });
}
