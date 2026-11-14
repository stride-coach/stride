import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

function signIn(page: Page, email = "athlete@example.com") {
  return signInAs(page, email);
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
  await expect(verdict.or(waiting)).toBeVisible();

  const form = page.getByRole("region", { name: "Ton corps ce matin" });
  await expect(form.getByRole("link", { name: "Détail" })).toHaveAttribute(
    "href",
    "/health/recovery",
  );
  if (await waiting.isVisible()) {
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

  const week = page.getByRole("region", {
    name: /^Cette semaine · S\d+ \/ \d+$/,
  });
  await expect(week.getByRole("listitem")).toHaveCount(7);
  await expect(week.locator('[aria-current="date"]')).toHaveCount(1);
  await expect(
    week.locator('[data-slot="session-row"][data-state="today"]'),
  ).toHaveCount(1);
  await expect(
    week.getByRole("progressbar", { name: "Volume de la semaine réalisé" }),
  ).toBeVisible();

  const goal = page.getByRole("region", { name: "Objectif" });
  await expect(
    goal.getByRole("link", { name: /Marathon de Paris/ }),
  ).toHaveAttribute("href", /^\/races\//);
  await expect(
    page.locator("main main").getByRole("link", { name: /Marathon de Paris/ }),
  ).toHaveCount(1);

  const queue = page.getByRole("region", { name: "À faire" });
  const legs = queue.getByRole("radiogroup", {
    name: "Et tes jambes ce matin ?",
  });
  const later = queue.getByRole("button", { name: "Plus tard" });
  const count = queue.getByText(/^\d+ sur \d+$/);
  const total = (await queue.count())
    ? Number((await count.textContent())?.split(" sur ")[1])
    : 0;
  for (let step = 1; step < total && !(await legs.count()); step++)
    await later.click();
  if (await legs.count()) {
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/today",
    );
    await legs.getByRole("radio", { name: "Fraîches" }).click();
    await saved;
    await expect(page.getByText("Ressenti enregistré.")).toBeVisible();
    await page.reload();
  }
  await expect(
    page.getByRole("radiogroup", { name: "Et tes jambes ce matin ?" }),
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
    page.getByRole("region", { name: /^Cette semaine/ }),
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
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("today switches between the day and the week from the URL", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page, "plan@example.com");
  await page.goto("/today");
  const views = page
    .getByRole("navigation", { name: "Vue" })
    .filter({ visible: true });
  await expect(views.getByRole("link", { name: "Jour" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await views.getByRole("link", { name: "Semaine" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/today\?view=week$/);
  const week = page.getByRole("region", { name: /^Semaine \d+$/ });
  await expect(week).toBeVisible();
  await expect(week.getByRole("listitem")).toHaveCount(7);
  await expect(
    page.getByRole("region", { name: "Séance du jour" }),
  ).toHaveCount(0);
  const title = await week.getByRole("heading", { level: 2 }).textContent();

  await page.reload();
  await expect(views.getByRole("link", { name: "Semaine" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(week.getByRole("heading", { level: 2 })).toHaveText(title ?? "");

  const next = week.getByRole("link", { name: "Semaine suivante" });
  if (await next.count()) {
    await next.click();
    await expect(page).toHaveURL(/\/today\?view=week&week=\d{4}-\d{2}-\d{2}$/);
    await expect(week.getByRole("heading", { level: 2 })).not.toHaveText(
      title ?? "",
    );
    await week.getByRole("link", { name: "Semaine précédente" }).click();
    await expect(week.getByRole("heading", { level: 2 })).toHaveText(
      title ?? "",
    );
  }

  await views.getByRole("link", { name: "Jour" }).click();
  await expect(page).toHaveURL(/\/today$/);
  await expect(
    page.getByRole("region", { name: "Séance du jour" }),
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await views.getByRole("link", { name: "Semaine" }).click();
  await expect(week).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
