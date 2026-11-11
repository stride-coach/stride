import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

const authPort = Number(process.env.PLAYWRIGHT_AUTH_PORT ?? 3200);

test.describe.configure({ mode: "serial" });

async function reset() {
  await fetch(`http://127.0.0.1:${authPort}/__test__/today-decisions`, {
    method: "DELETE",
  });
}

test.beforeEach(reset);
test.afterAll(reset);

async function openToday(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "today-decisions@example.com");
  await page.goto("/today");
  const session = page.getByRole("region", { name: "Séance du jour" });
  await expect(session.getByRole("heading", { level: 2 })).toHaveText(
    "Footing",
  );
  return session;
}

test("accepting today's adjustment applies it to the plan", async ({
  page,
}) => {
  const session = await openToday(page);
  await expect(session.getByText("Proposition", { exact: true })).toBeVisible();
  await expect(
    session.getByText("Un footing de 30 min à la place des 45 min prévues."),
  ).toBeVisible();

  await session.getByRole("button", { name: "Accepter" }).click();
  await expect(page.getByText("Proposition appliquée au plan.")).toBeVisible();
  await expect(session.getByRole("heading", { level: 2 })).toHaveText(
    "Footing court",
  );
  await expect(session.getByText("Proposition", { exact: true })).toHaveCount(
    0,
  );

  await page.goto("/plan");
  await expect(page.getByText("Footing court").first()).toBeVisible();
});

test("keeping the planned session declines the adjustment", async ({
  page,
}) => {
  const session = await openToday(page);
  await session.getByRole("button", { name: "Garder Footing" }).click();
  await expect(page.getByText("Tu gardes Footing.")).toBeVisible();
  await expect(session.getByText("Proposition", { exact: true })).toHaveCount(
    0,
  );
  await expect(session.getByRole("button", { name: "Accepter" })).toHaveCount(
    0,
  );
  await expect(session.getByRole("heading", { level: 2 })).toHaveText(
    "Footing",
  );
});

test("Pourquoi ? opens the coach's reasoning", async ({ page }) => {
  const session = await openToday(page);
  await session.getByRole("link", { name: "Pourquoi ?" }).click();
  await expect(page).toHaveURL(/\/plan\?proposal=/);
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "Ton sommeil baisse depuis trois nuits. Je garde la sortie, plus courte.",
      ),
  ).toBeVisible();
});

test("moving today's session places it on another day of the week", async ({
  page,
}) => {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "Europe/Paris",
  }).format(new Date());
  test.skip(weekday === "Sunday", "No day is left in the week on Sunday.");
  const session = await openToday(page);
  await expect(session.getByRole("button", { name: "Déplacer" })).toHaveCount(
    0,
  );
  await session.getByRole("button", { name: "Garder Footing" }).click();
  await expect(page.getByText("Tu gardes Footing.")).toBeVisible();

  await session.getByRole("button", { name: "Déplacer" }).click();
  const tomorrow = page.getByRole("menuitem").first();
  await expect(tomorrow).toContainText("Libre");
  await tomorrow.click();
  await expect(page.getByText(/^Séance déplacée : /)).toBeVisible();
  await expect(session.getByRole("heading", { level: 2 })).toHaveText(
    "Jour de repos",
  );
});
