import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page, email = "athlete@example.com") {
  return signInAs(page, email);
}

async function answerCheckin(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Check-in du jour" });
  for (const [question, answer] of [
    ["Jambes", "Fraîches"],
    ["Sommeil ressenti", "Reposant"],
    ["Courbatures", "Aucune"],
    ["Stress hors sport", "Bas"],
  ])
    await dialog
      .getByRole("radiogroup", { name: question })
      .getByRole("radio", { name: answer })
      .click();
  await expect(dialog.getByText(/^Enregistré à \d{2}:\d{2}$/)).toBeVisible();
  await dialog.getByRole("button", { name: "Terminé" }).click();
  await expect(dialog).toBeHidden();
}

test("signed-out athletes are sent to sign-in", async ({ page }) => {
  await page.goto("/today");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("today weighs the session against the form and asks one question at a time", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/today");
  await expect(
    page.getByRole("link", { name: "Aujourd’hui", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /^Aujourd’hui, [a-z]{3}\. \d{2}\/\d{2}\/\d{4}$/,
    }),
  ).toBeAttached();
  await expect(page.getByRole("region", { name: "À venir" })).toHaveCount(0);

  const session = page.getByRole("region", { name: "Séance du jour" });
  await expect(session.getByRole("heading", { level: 2 })).toBeVisible();
  const verdict = session.getByRole("group", { name: "Verdict du jour" });
  const waiting = session.getByText(
    "Le Coach attend tes données de la nuit pour confirmer la séance. En attendant, voici ce que prévoit le plan.",
  );
  const proposed = session.getByText("Proposition", { exact: true });
  await expect(verdict.or(waiting).or(proposed)).toBeVisible();

  const form = page.getByRole("region", { name: "Ton corps ce matin" });
  await expect(form.getByRole("link", { name: "Détail" })).toHaveAttribute(
    "href",
    "/health/recovery",
  );
  if (await proposed.isVisible()) {
    await expect(waiting).toHaveCount(0);
  } else if (await waiting.isVisible()) {
    await expect(session.getByText("Prévue au plan")).toBeVisible();
    await expect(verdict).toHaveCount(0);
    await expect(form.getByText("En attente de ta montre")).toBeVisible();
    await expect(
      form.getByRole("button", { name: /Synchroniser/ }),
    ).toBeVisible();
  } else {
    await expect(
      verdict.getByText(/^(Séance maintenue|Avec prudence|À revoir|Récupère)$/),
    ).toBeVisible();
    await expect(form.getByText(/^Compatible avec .+ \?$/)).toBeVisible();
  }

  const week = page.getByRole("region", { name: /^Semaine \d+$/ });
  await expect(week.getByRole("listitem")).toHaveCount(7);
  await expect(week.locator('[aria-current="date"]')).toHaveCount(1);

  const goal = page.getByRole("region", { name: "Objectif" });
  await expect(
    goal.getByRole("link", { name: /Marathon de Paris/ }),
  ).toHaveAttribute("href", /^\/races\//);
  await expect(
    page.locator("main main").getByRole("link", { name: /Marathon de Paris/ }),
  ).toHaveCount(1);

  const queue = page.getByRole("region", { name: "À faire" });
  const checkin = queue.getByRole("button", { name: "Faire le check-in" });
  const later = queue.getByRole("button", { name: "Plus tard" });
  const count = queue.getByText(/^\d+ sur \d+$/);
  const total = (await queue.count())
    ? Number((await count.textContent())?.split(" sur ")[1])
    : 0;
  for (let step = 1; step < total && !(await checkin.count()); step++)
    await later.click();
  if (await checkin.count()) {
    await checkin.click();
    await answerCheckin(page);
    await page.reload();
  }
  await expect(
    page
      .getByRole("region", { name: "À faire" })
      .getByRole("button", { name: "Faire le check-in" }),
  ).toHaveCount(0);
});

test("today shows only the first of several questions", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/today");
  const queue = page.getByRole("region", { name: "À faire" });
  test.skip((await queue.count()) === 0, "No pending question");
  const count = queue.getByText(/^\d+ sur \d+$/);
  await expect(count).toHaveText(/^1 sur \d+$/);
  const total = Number((await count.textContent())?.split(" sur ")[1]);
  await expect(
    queue.getByRole("radiogroup").or(queue.getByRole("group")),
  ).toHaveCount(1);
  if (total > 1) {
    await queue.getByRole("button", { name: "Plus tard" }).click();
    await expect(count).toHaveText(`2 sur ${total}`);
  } else {
    await expect(queue.getByRole("button", { name: "Plus tard" })).toHaveCount(
      0,
    );
  }
});

test("today explains the missing plan and keeps Garmin data", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/today");
  const session = page.getByRole("region", { name: "Séance du jour" });
  await expect(
    session.getByRole("heading", { level: 2, name: "Pas encore de plan" }),
  ).toBeVisible();
  await expect(
    session.getByRole("link", { name: "Ajouter une course" }),
  ).toHaveAttribute("href", "/races/new");
  await expect(
    page.getByRole("region", { name: /^(Cette semaine|Semaine \d+)/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Ton corps ce matin" }),
  ).toBeVisible();
  await expect(page.getByRole("region", { name: "Objectif" })).toBeVisible();
});

test("today stacks the day in reading order on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "plan@example.com");
  await page.goto("/today");
  await expect(
    page.getByRole("heading", { level: 1, name: "Aujourd’hui" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Séance du jour" }),
  ).toBeVisible();
  const order = await Promise.all(
    [
      "Séance du jour",
      "À faire",
      "Ton corps ce matin",
      /^Cette semaine/,
      "Objectif",
    ].map(async (name) => {
      const region = page.getByRole("region", { name });
      return (await region.count())
        ? ((await region.boundingBox())?.y ?? -1)
        : -1;
    }),
  ).then((values) => values.filter((y) => y >= 0));
  expect(order.length).toBeGreaterThanOrEqual(4);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  const week = page.getByRole("region", { name: /^Cette semaine/ });
  await expect(
    week.locator('[data-slot="session-row"][data-state="today"]'),
  ).toHaveCount(1);
  await expect(page.getByRole("region", { name: /^Semaine \d+$/ })).toHaveCount(
    0,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("today leads with the week and keeps today's session below it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/today?view=week&week=2026-01-05");
  await expect(page.getByRole("navigation", { name: "Vue" })).toHaveCount(0);
  const week = page.getByRole("region", { name: /^Semaine \d+$/ });
  const session = page.getByRole("region", { name: "Séance du jour" });
  await expect(week).toBeVisible();
  await expect(session).toBeVisible();
  const [weekBox, sessionBox] = await Promise.all([
    week.boundingBox(),
    session.boundingBox(),
  ]);
  expect(weekBox?.y ?? 0).toBeLessThan(sessionBox?.y ?? 0);
  await expect(week.locator('[aria-current="date"]')).toHaveCount(1);
  await expect(
    week.getByRole("link", { name: "Voir le plan →" }),
  ).toHaveAttribute("href", /^\/plan\?week=\d{4}-\d{2}-\d{2}$/);
  await expect(
    page.getByRole("link", { name: /^Semaine (précédente|suivante)$/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: /^Cette semaine/ }),
  ).toHaveCount(0);

  const plan = week.getByRole("link", { name: "Voir le plan →" });
  await plan.focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("the sidebar check-in records the morning in under a minute", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "seasons@example.com");
  await page.goto("/plan");
  const entry = page.getByRole("button", { name: "Check-in du jour" });
  await expect(entry).toBeVisible();
  await entry.click();
  await answerCheckin(page);
  await expect(entry).toHaveCount(0);
  await expect(page).toHaveURL(/\/plan$/);

  await page.goto("/health/recovery");
  const feeling = page.getByRole("region", { name: "Ton ressenti" });
  await expect(
    feeling
      .getByRole("radiogroup", { name: "Sommeil ressenti" })
      .getByRole("radio", { name: "Reposant" }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Check-in du jour" }),
  ).toHaveCount(0);
});
