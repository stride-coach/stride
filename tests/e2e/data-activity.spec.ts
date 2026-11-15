import { expect, test, type Page } from "@playwright/test";
import type { DataActivityObservation } from "../../src/features/data-activity/model";
import { signInAs } from "./support/session";

const successAt = "2026-10-13T06:12:00Z";
function observation(
  state: "running" | "complete" = "running",
  count = 20,
): DataActivityObservation {
  const category = {
    state,
    oldestSynchronizedDate: "2026-01-01",
    lastSuccessAt: state === "complete" ? successAt : null,
    lastErrorCode: null,
    activityCount: null,
  };
  return {
    connection: "connected",
    sync: {
      started: true,
      lastSyncAt: successAt,
      updatedAt: successAt,
      categories: {
        activities: { ...category, activityCount: count },
        recovery: category,
        fitness: category,
        patterns: category,
      },
    },
  };
}
function signIn(page: Page) {
  return signInAs(page, "athlete@example.com");
}
async function pollNow(page: Page) {
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
}

test("the Garmin panel explains the data and applies fresh activities", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let value = observation("complete");
  await page.route("**/api/data-activity", (route) =>
    route.fulfill({ json: value }),
  );
  await signIn(page);
  await page.goto("/activities");
  const status = page
    .getByRole("button", { name: /État des données/ })
    .filter({ visible: true })
    .first();
  await expect(status).toContainText("synchronisé");
  await status.click();
  const panel = page.getByRole("dialog", { name: "État des données" });
  const categories = panel.getByRole("list");
  await expect(
    categories.getByText("Activités", { exact: true }),
  ).toBeVisible();
  await expect(
    categories.getByText("Sommeil et récupération", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(status).toBeFocused();

  const list = page.getByRole("region", { name: "Liste des activités" });
  const before = await list.boundingBox();
  value = observation("complete", 21);
  value.sync.categories.activities.lastSuccessAt = "2026-10-13T06:15:00Z";
  await pollNow(page);
  const apply = page.getByRole("button", { name: "Afficher", exact: true });
  await expect(apply).toBeVisible();
  expect(await list.boundingBox()).toEqual(before);
  await apply.click();
  await expect(apply).not.toBeVisible();
  await pollNow(page);
  await expect(apply).not.toBeVisible();
});

test("a slow navigation shows the header thread until another one replaces it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page);
  await page.goto("/activities");
  const list = page.getByRole("region", { name: "Liste des activités" });
  await expect(list).toBeVisible();
  const before = await list.boundingBox();
  const gate = await holdNavigation(page, "/health/fitness");
  try {
    await page.getByRole("link", { name: "Santé", exact: true }).click();
    await gate.requested;
    await expectHeaderThread(page);
    expect(new URL(page.url()).pathname).toBe("/activities");
    expect(await list.boundingBox()).toEqual(before);
    await page
      .getByRole("navigation", { name: "Filtrer par sport" })
      .getByRole("link", { name: /^Course/ })
      .click();
    await expect(page).toHaveURL(/activities\?filter=road$/);
  } finally {
    gate.release();
  }
  await expect(
    page.getByTestId("data-activity-thread").filter({ visible: true }),
  ).toHaveCount(0);
  await expect(page).toHaveURL(/activities\?filter=road$/);
});

async function holdNavigation(page: Page, path: string) {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrived = () => {};
  const requested = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route(`**${path}?*`, async (route) => {
    if (route.request().headers().rsc !== "1") return route.continue();
    arrived();
    await gate;
    await route.continue();
  });
  return { requested, release };
}

async function expectHeaderThread(page: Page) {
  const thread = page
    .getByTestId("data-activity-thread")
    .filter({ visible: true });
  await expect(thread).toHaveCount(1);
  const geometry = await thread.evaluate((element) => {
    const line = element.getBoundingClientRect();
    const header = element.parentElement!.getBoundingClientRect();
    return {
      height: line.height,
      bottom: line.bottom,
      headerBottom: header.bottom,
      width: line.width,
      headerWidth: header.width,
    };
  });
  expect(geometry.height).toBe(2);
  expect(Math.abs(geometry.bottom - geometry.headerBottom)).toBeLessThanOrEqual(
    1,
  );
  expect(Math.abs(geometry.width - geometry.headerWidth)).toBeLessThanOrEqual(
    2,
  );
  return thread;
}
