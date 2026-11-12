import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

const monthTitle = /^[A-ZÀ-Ý][a-zà-ÿ]+ \d{4}$/;

test("Calendrier shows the plan as a month and opens a session", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "plan@example.com");
  await page.goto("/plan");
  await page
    .getByRole("navigation", { name: "Sections du plan" })
    .getByRole("link", { name: "Calendrier" })
    .click();
  await expect(page).toHaveURL(/\/plan\/calendar$/);
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toHaveText(monthTitle, { timeout: 20_000 });
  const summary = page.getByRole("complementary", { name: "Résumé du mois" });
  await expect(summary.getByText("Prévu", { exact: true })).toBeVisible();
  await expect(summary.getByText("Séances", { exact: true })).toBeVisible();

  const grid = page.getByRole("grid");
  const cells = grid.getByRole("gridcell");
  expect([35, 42]).toContain(await cells.count());
  const today = grid.locator('[role="gridcell"][aria-current="date"]');
  await expect(today).toHaveAttribute("tabindex", "0");
  await today.focus();
  const todayIndex = await cells.evaluateAll((items) =>
    items.findIndex((item) => item.getAttribute("aria-current") === "date"),
  );
  const step = todayIndex % 7 === 6 ? "ArrowLeft" : "ArrowRight";
  const neighbour = cells.nth(todayIndex + (step === "ArrowLeft" ? -1 : 1));
  await page.keyboard.press(step);
  await expect(neighbour).toBeFocused();
  await expect(neighbour).toHaveAttribute("tabindex", "0");
  await expect(today).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowDown");
  await expect(neighbour).toBeFocused();

  const withSession = cells.filter({
    has: page.locator('a[href*="session="]'),
  });
  const day = withSession.first();
  await day.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 20_000 });
  await expect(page).toHaveURL(/\/plan\/calendar\?month=\d{4}-\d{2}&session=/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/plan\/calendar$/);

  const shown = await title.textContent();
  const months = page.getByRole("navigation", { name: "Changer de mois" });
  const next = months.getByRole("link", { name: "Mois suivant" });
  await next.click();
  await expect(page).toHaveURL(/\/plan\/calendar\?month=\d{4}-\d{2}$/);
  await expect(title).not.toHaveText(shown ?? "");
  await months.getByRole("link", { name: "Aujourd’hui" }).click();
  await expect(page).toHaveURL(/\/plan\/calendar$/);
  await expect(title).toHaveText(shown ?? "");
});

test("Calendrier fits a phone and lists the selected week", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, "plan@example.com");
  await page.goto("/plan/calendar");
  const tabs = page.getByRole("navigation", { name: "Sections du plan" });
  await expect(tabs.getByRole("link", { name: "Calendrier" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const grid = page.getByRole("grid");
  await expect(grid).toBeVisible({ timeout: 20_000 });
  const week = page.getByRole("heading", { level: 2, name: /^Semaine du / });
  const current = await week.textContent();
  const cells = grid.getByRole("gridcell");
  const count = await cells.count();
  const todayIndex = await cells.evaluateAll((items) =>
    items.findIndex((item) => item.getAttribute("aria-current") === "date"),
  );
  await cells.nth(todayIndex).focus();
  await page.keyboard.press(todayIndex + 7 < count ? "ArrowDown" : "ArrowUp");
  await page.keyboard.press("Enter");
  await expect(week).not.toHaveText(current ?? "");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
