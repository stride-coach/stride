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
        page
          .getByText("Objectif de la saison", { exact: true })
          .filter({ visible: true }),
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
      "Météo",
      "Scénarios",
      "Assistance",
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
    const before = page.getByRole("complementary", {
      name: "Avant la course",
    });
    await expect(before).toContainText("GPX importé");
    await expect(
      page.getByRole("region", {
        name: "Où tu en es → ce que la course demande",
      }),
    ).toBeVisible();
    await sections.getByRole("link", { name: "Équipement" }).click();
    await expect(
      sections.getByRole("link", { name: "Équipement" }),
    ).toHaveAttribute("aria-current", "page");
    for (const list of ["J-7", "J-1", "Jour J"])
      await expect(
        page.getByText(list, { exact: true }).filter({ visible: true }).first(),
      ).toBeVisible();
  });
}

test("the mobile header keeps the add-race title clear of its actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await signIn(page);
  await page.goto("/races/new");
  const header = page.locator("header").filter({ visible: true }).first();
  const title = header
    .getByText("Ajouter une course", { exact: true })
    .filter({ visible: true });
  await expect(title).toBeVisible();
  const actions = header.locator('[data-slot="mobile-header-actions"]');
  const titleBox = (await title.boundingBox())!;
  const actionsBox = (await actions.boundingBox())!;
  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(actionsBox.x);
});

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
    await page.getByLabel("Lieu", { exact: true }).fill("Chevreuse (78)");
    await page
      .getByRole("group", { name: "Bâtons" })
      .getByRole("button", { name: "Interdits" })
      .click();
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Qu’en attends-tu ?" }),
    ).toBeVisible();
    await page.getByText("C · Course de préparation").click();
    await page
      .getByRole("group", { name: "Ce que tu en attends" })
      .getByRole("button", { name: "Répétition générale" })
      .click();
    await page.getByRole("button", { name: "Départ de nuit" }).click();
    await page
      .getByRole("textbox", { name: "Autre chose à tester" })
      .fill("Gilet hydratation");
    await page.getByRole("button", { name: "Ajouter", exact: true }).click();
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
    await expect(page.getByLabel("Lieu", { exact: true })).toHaveValue(
      "Chevreuse (78)",
    );
    await expect(
      page
        .getByRole("group", { name: "Bâtons" })
        .getByRole("button", { name: "Interdits" }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Nom", { exact: true }).fill(`${viewport.name} 2027`);
    await page.getByRole("button", { name: "Continuer" }).click();
    await expect(
      page.getByRole("radio", { name: /C · Course de préparation/ }),
    ).toBeChecked();
    await expect(
      page
        .getByRole("group", { name: "Ce que tu en attends" })
        .getByRole("button", { name: "Répétition générale" }),
    ).toHaveAttribute("aria-pressed", "true");
    for (const item of ["Départ de nuit", "Gilet hydratation"])
      await expect(page.getByRole("button", { name: item })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
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

test("a past race opens its after-race tab", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "seasons@example.com");
  await page.goto("/races/12121212-0000-4000-8000-000000000010");
  const sections = page.getByRole("navigation", {
    name: "Sections de la course",
  });
  await sections.getByRole("link", { name: "Après-course" }).click();
  await expect(page).toHaveURL(/\/after$/);
  await expect(
    sections.getByRole("link", { name: "Après-course" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByText("Résultat non trouvé")
      .or(page.getByRole("heading", { name: "Ta course sur ton plan" })),
  ).toBeVisible();
  const after = page.getByRole("navigation", {
    name: "Vues de l’après-course",
  });
  await after.getByRole("link", { name: "Comparer" }).click();
  await expect(page).toHaveURL(/\/after\/compare$/);
  await expect(
    sections.getByRole("link", { name: "Après-course" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByText("Aucune autre édition à comparer")).toBeVisible();
  await after.getByRole("link", { name: "Cette course" }).click();
  await page.getByRole("button", { name: "Refaire cette course" }).click();
  const redo = page.getByRole("dialog", { name: "Refaire cette course" });
  await expect(redo.getByLabel("Date")).not.toHaveValue("");
  await redo.getByRole("button", { name: "Annuler" }).click();
  await page.goto("/races/new?from=12121212-0000-4000-8000-000000000010");
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue(
    "Trail des Lacs 30K",
  );
  await expect(
    page.getByText(/^Pré-remplie d’après l’édition \d{4}\./),
  ).toBeVisible();
  await expect(page.getByLabel("Distance", { exact: true })).toHaveValue("30");
  await expect(page.getByLabel("Date", { exact: true })).not.toHaveValue("");
});

test("adding a race asks the coach for its effect on the plan", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const authPort = process.env.PLAYWRIGHT_AUTH_PORT ?? "3200";
  const thread = "c0c0c0c0-0000-4000-8000-0000000005a0";
  const posts: {
    target?: { kind: string; raceId: string | null };
    mode?: string;
    input?: { consult?: string; text?: string };
  }[] = [];
  await page.route("**/api/coach/turns", async (route) => {
    const posted = route.request().postDataJSON();
    posts.push(posted);
    const now = new Date().toISOString();
    await fetch(`http://127.0.0.1:${authPort}/__test__/coach-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          id: thread,
          user_id: "55555555-5555-4555-8555-555555555555",
          managed_session_id: "sesn_01Course",
          mode: "plan",
          status: "awaiting_athlete",
          title: "Ajouter Trail des Étangs",
          race_id: posted?.target?.raceId ?? null,
          last_activity_at: now,
          created_at: now,
        },
      }),
    });
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      body: `data: ${JSON.stringify({ type: "session", sessionId: "sesn_01Course", threadId: thread, consoleUrl: "" })}\n\n`,
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "plan@example.com");
  await page.goto("/races/new?priority=C");
  await page.getByLabel("Nom", { exact: true }).fill("Trail des Étangs");
  await page.getByLabel("Date", { exact: true }).fill("10/08/2027");
  await page.getByLabel("Distance", { exact: true }).fill("21");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Voir l’effet sur le plan" }).click();
  await expect(page.getByText("Le coach prépare ton plan…")).toBeVisible();
  await expect(
    page.getByText(
      "Le coach a une question avant de te proposer un changement.",
    ),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("link", { name: "Répondre au coach" }),
  ).toHaveAttribute("href", `/coach/${thread}`);
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({
    target: { kind: "new_topic" },
    mode: "plan",
    input: { consult: "director" },
  });
  expect(posts[0].input?.text).toContain("Trail des Étangs, course C");

  await page.getByRole("link", { name: "Voir la course" }).click();
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
});
