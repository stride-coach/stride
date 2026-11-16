import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

test("the decisions log opens a decision, steps through the month and returns to the exchange", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "coach-decisions@example.com");
  await page.goto("/coach");
  const sidebar = page.locator("li", {
    has: page.getByRole("link", { name: "Coach", exact: true }),
  });
  await sidebar.getByRole("link", { name: "Décisions" }).click();
  await expect(page).toHaveURL("/coach/decisions", { timeout: 20_000 });
  await expect(
    page
      .getByRole("navigation", { name: "Sections du Coach" })
      .filter({ visible: true })
      .getByRole("link", { name: "Décisions" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("complementary", { name: "Résumé des décisions" }),
  ).toContainText("30 derniers jours");

  await page.getByRole("link", { name: /Un footing à la place/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByRole("heading", { name: "Un footing à la place" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(sheet).toContainText(/Décision \d+ sur \d+ en /);
  await expect(sheet).toContainText("En attente");
  await expect(sheet.getByText("Proposée par")).toBeVisible();

  const next = sheet.getByRole("link", { name: "Décision suivante" });
  const previous = sheet.getByRole("link", { name: "Décision précédente" });
  const step = (await next.count()) > 0 ? next : previous;
  await step.click();
  await expect(
    sheet.getByRole("heading", { name: "Un footing à la place" }),
  ).toHaveCount(0);
  await expect(sheet.getByRole("heading").first()).toBeVisible();
  await sheet
    .getByRole("link", {
      name: step === next ? "Décision précédente" : "Décision suivante",
    })
    .click();
  await expect(
    sheet.getByRole("heading", { name: "Un footing à la place" }),
  ).toBeVisible();

  await sheet.getByRole("link", { name: "Voir l’échange" }).click();
  await expect(page).toHaveURL("/coach", { timeout: 20_000 });
});
