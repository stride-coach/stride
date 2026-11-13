import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

test.describe.configure({ mode: "serial" });

test("a populated race opens every workspace section on desktop and mobile", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/races");
    await page.getByRole("link", { name: "Voir le plan de course" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "EcoTrail Paris 120K" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^4 points/ })).toHaveAttribute(
      "href",
      "/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/waypoints",
    );
    const pace = page.locator("dl > div", { hasText: "Allure moy" });
    await expect(pace).toContainText("12:00 /km");
    await expect(page.getByText("Météo du jour J")).toHaveCount(0);
    const margin = page.locator("dl > div", { hasText: "Marge barrière" });
    if (viewport.width < 500) await expect(margin).toContainText("2h");
    else await expect(margin).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Poser une question" }).first(),
    ).toHaveAttribute(
      "href",
      "/coach?race=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    const axis = page.getByRole("slider", {
      name: "Position sur le parcours",
    });
    const cursor = page.getByRole("region", { name: "Sous le curseur" });
    await expect(async () => {
      await axis.focus();
      await axis.press("End");
      await expect(axis).toHaveAttribute("aria-valuetext", /^km 30, /, {
        timeout: 1000,
      });
    }).toPass();
    await expect(cursor).toContainText("km 30 ·");
    await axis.press("Home");
    await expect(axis).toHaveAttribute("aria-valuetext", /^km 0, /);
    await axis.press("Shift+ArrowRight");
    await expect(axis).toHaveAttribute("aria-valuetext", /^km 1, /);
    await expect(page.getByText(/^km 1 · \d\d:\d\d$/).first()).toBeVisible();
    await axis.press("Home");
    await expect(cursor.getByText("Terrain")).toBeVisible();
    await expect(cursor.getByText("Consigne")).toBeVisible();
    const roadbook = page.getByRole("region", { name: "Carnet de route" });
    const rows = roadbook.locator("tbody tr");
    await expect(rows.first()).toHaveAttribute("aria-current", "true");
    await rows.nth(1).getByRole("button").click();
    await expect(rows.nth(1)).toHaveAttribute("aria-current", "true");
    await expect(rows.first()).not.toHaveAttribute("aria-current", "true");
    await expect(roadbook.locator("tfoot")).toContainText("Total");
    const map = page
      .getByRole("img", { name: /^Carte du parcours/ })
      .filter({ visible: true })
      .first();
    await map.scrollIntoViewIfNeeded();
    const marker = map.getByRole("button", { name: "Arrivée, km 30,0" });
    await expect(marker).toBeVisible();
    const centre = () =>
      marker.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const bounds = element.closest('[role="img"]')!.getBoundingClientRect();
        return {
          x: box.x + box.width / 2 - bounds.x,
          y: box.y + box.height / 2 - bounds.y,
        };
      });
    await expect
      .poll(async () => {
        const first = await centre();
        await page.waitForTimeout(200);
        const second = await centre();
        return Math.hypot(second.x - first.x, second.y - first.y);
      })
      .toBeLessThan(0.5);
    const before = await centre();
    const box = await marker.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await expect
      .poll(() =>
        marker
          .locator("span")
          .evaluate((element) => getComputedStyle(element).scale),
      )
      .toBe("1.1");
    const after = await centre();
    expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: `test-results/race-course-${viewport.width}.png`,
      fullPage: true,
    });
    const expand = page.getByRole("button", { name: "Plein écran" });
    await expand.click();
    const fullscreen = page.getByRole("dialog", {
      name: "Carte plein écran · EcoTrail Paris 120K",
    });
    await expect(fullscreen).toBeVisible();
    await expect(
      fullscreen.getByRole("button", { name: "Passages" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      fullscreen.getByRole("img", { name: /^Carte du parcours/ }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      fullscreen.getByRole("complementary", { name: "Tronçons" }),
    ).toContainText("T1");
    const frame = await fullscreen.boundingBox();
    if (viewport.width < 500) {
      expect(frame?.width).toBe(viewport.width);
      expect(frame?.height).toBe(viewport.height);
    } else {
      expect(frame?.x).toBeGreaterThan(0);
      await expect(
        page.getByRole("navigation", { name: "Fil d’Ariane" }),
      ).toContainText("Carte");
    }
    await page.screenshot({
      path: `test-results/race-map-fullscreen-${viewport.width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(fullscreen).toBeHidden();
    await expect(expand).toBeFocused();
    const sections = page.getByRole("navigation", {
      name: "Sections de la course",
    });
    for (const label of ["Ravitaillement", "Équipement", "Préparation"]) {
      await sections.getByRole("link", { name: label }).click();
      await expect(
        page.getByRole("heading", { level: 1, name: "EcoTrail Paris 120K" }),
      ).toBeVisible();
    }
    await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/waypoints");
    const list = page.getByRole("heading", { name: /Points de passage/ });
    await expect(list).toBeVisible();
    if (viewport.width < 500) await expect(list).toContainText("4 points");
    await expect(page.getByRole("button", { name: /Départ/ })).toHaveCount(0);
    if (viewport.width < 1024) {
      const row = page.getByRole("button", { name: /Ravito du Bois/ });
      await expect(row).toContainText("km 10,0");
      await expect(row).toContainText("Alerte");
      await row.click();
    } else {
      const row = page.getByRole("row", { name: /Ravito du Bois/ });
      await expect(row).toContainText("10,0");
      await expect(row).toContainText("Ravitaillement");
      await expect(row).toContainText("5 min");
      await row.getByRole("button", { name: "Ravito du Bois" }).click();
      await expect(row).toHaveAttribute("aria-current", "true");
    }
    const editor = page.getByRole("region", {
      name: "Modifier Ravito du Bois",
    });
    await expect(
      page.getByRole("heading", { name: "Modifier · Ravito du Bois" }),
    ).toBeVisible();
    await expect(
      editor.getByText("Vide : 5 min, comme les autres ravitos"),
    ).toBeVisible();
    await expect(
      editor.getByRole("button", { name: "Ravitaillement" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(editor.getByRole("checkbox", { name: "Eau" })).toBeChecked();
    await expect(editor.getByText("Accroché au tracé")).toBeVisible();
    await expect(editor.getByText("Dans 500 m")).toBeVisible();
    await page.screenshot({
      path: `test-results/race-waypoints-${viewport.width}.png`,
      fullPage: true,
    });
  }
});

test("the simulation settings recalculate the plan and can be undone", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  const panel = page.getByRole("region", { name: "Régler la simulation" });
  const stop = panel.getByRole("group", { name: "Arrêt par ravito" });
  const before = await stop.locator("output").textContent();
  const stops = panel.getByText(/arrêts? · .+ au total$/);
  const first = await stops.textContent();
  await stop
    .getByRole("button", { name: "Augmenter l’arrêt par ravito" })
    .click();
  const toast = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: /^Arrêt par ravito : / });
  await expect(toast).toBeVisible();
  await expect(stop.locator("output")).not.toHaveText(before ?? "");
  await expect(stops).not.toHaveText(first ?? "", { timeout: 15_000 });
  await toast.getByRole("button", { name: "Annuler" }).click();
  await expect(stop.locator("output")).toHaveText(before ?? "", {
    timeout: 15_000,
  });
  await expect(stops).toHaveText(first ?? "", { timeout: 15_000 });
  await panel.getByText("Historique des réglages").click();
  const history = panel.locator("details li");
  await expect(history).toHaveCount(2, { timeout: 15_000 });
  const raised = (await stop.locator("output").textContent()) ?? "";
  await history
    .first()
    .getByRole("button", { name: /^Rétablir/ })
    .click();
  await expect(stop.locator("output")).not.toHaveText(raised, {
    timeout: 15_000,
  });
  await expect(history).toHaveCount(3, { timeout: 15_000 });
  await expect(panel.getByText("Arrivée", { exact: true })).toBeVisible();
});

test("the climbs view lists the climbs and switches the walking threshold", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await page
    .getByRole("navigation", { name: "Vues du plan de course" })
    .filter({ visible: true })
    .getByRole("link", { name: "Côtes" })
    .click();
  await expect(page).toHaveURL(/\/climbs$/);
  await expect(
    page.getByRole("heading", { name: "Le profil, côte par côte" }),
  ).toBeVisible();
  const picker = page.getByRole("radiogroup", { name: "Marcher dès" });
  const current = picker.getByRole("radio", { checked: true });
  const before = await current.textContent();
  const comparison = page.getByRole("region", {
    name: "Ce que change le seuil",
  });
  await expect(comparison.locator('tr[aria-current="true"]')).toContainText(
    before ?? "",
  );
  await picker.getByRole("radio", { name: "6 %" }).click();
  await expect(picker.getByRole("radio", { name: "6 %" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(comparison.locator('tr[aria-current="true"]')).toContainText(
    "6 %",
    { timeout: 15_000 },
  );
  await page
    .locator("[data-sonner-toast]")
    .filter({ hasText: "Marcher dès : 6 %" })
    .getByRole("button", { name: "Annuler" })
    .click();
  await expect(comparison.locator('tr[aria-current="true"]')).toContainText(
    before ?? "",
    { timeout: 15_000 },
  );
});

test("the weather view reads the weather at the athlete's passage", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    await page
      .getByRole("navigation", { name: "Vues du plan de course" })
      .filter({ visible: true })
      .getByRole("link", { name: "Météo" })
      .click();
    await expect(page).toHaveURL(/\/weather$/);
    await expect(
      page
        .getByRole("heading", { name: "La météo au fil de ta course" })
        .or(page.getByText("Météo indisponible pour l’instant")),
    ).toBeVisible({ timeout: 20_000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("the scenarios view compares, creates and chooses a scenario", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/scenarios");
  const objective = page.getByRole("article", { name: /^Objectif/ });
  await expect(objective).toContainText("6h00");
  const create = page.getByRole("form", { name: "Créer un scénario" });
  const prudentCard = page.getByRole("article", { name: /^Prudent/ });
  if (await create.isVisible()) {
    const kind = create.getByRole("button", { name: "Prudent" });
    if (await kind.isVisible()) await kind.click();
    await create.getByRole("textbox").fill("5h00");
    await create.getByRole("button", { name: "Ajouter" }).click();
    await expect(create.getByRole("alert")).toContainText("plus lent");
    await create.getByRole("textbox").fill("6h45");
    await create.getByRole("button", { name: "Ajouter" }).click();
    await expect(prudentCard).toBeVisible({ timeout: 15_000 });
  }
  await expect(prudentCard).toBeVisible();
  const prudent =
    (await prudentCard.locator("[data-slot=metric]").textContent()) ?? "";
  await expect(
    page.getByRole("region", { name: "Heures de passage" }),
  ).toContainText("Ravito du Bois");
  await prudentCard
    .getByRole("button", { name: "En faire mon objectif" })
    .click();
  await expect(objective).toContainText(prudent, { timeout: 15_000 });
  await page
    .locator("[data-sonner-toast]")
    .filter({ hasText: `Nouvel objectif : ${prudent}` })
    .getByRole("button", { name: "Annuler" })
    .click();
  await expect(objective).toContainText("6h00", { timeout: 15_000 });
  await expect(prudentCard).toContainText(prudent);
});

test("the plan de course follows the timeline and applies a strategy proposal", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/scenarios");

  const timeline = page.getByRole("list", {
    name: "Plan de course par tronçon",
  });
  await expect(
    timeline.getByRole("heading", { name: "Ravito du Bois" }),
  ).toBeVisible();
  await expect(timeline.getByRole("article")).toHaveCount(3);
  await expect(
    timeline.getByRole("article", { name: /^Tronçon T1, Départ → Ravito/ }),
  ).toContainText("Allure en courant");
  await expect(
    page.getByRole("button", { name: "Imprimer le roadbook" }),
  ).toBeVisible();
  const objective = page.getByRole("article", { name: /^Objectif/ });
  await expect(objective).toHaveAttribute("aria-current", "true");
  await expect(objective).toContainText("6h00");
  const arrival = page.getByRole("complementary", {
    name: "Résumé du plan de course",
  });
  await expect(arrival).toContainText("14:00");
  await expect(arrival).toContainText("barrière 16:00 · marge 2h00");
  const strategy = page.getByRole("region", { name: "Consignes du stratège" });
  await expect(strategy).toContainText("3 changements proposés");

  await strategy
    .getByRole("link", { name: "Examiner les changements" })
    .click();
  const sheet = page.getByRole("dialog", { name: "Stratégie du stratège" });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Consignes du stratège");
  await expect(sheet).toContainText("T1 · Départ → Ravito du Bois · allure");
  await expect(sheet).toContainText("5 % plus prudent");
  await page.screenshot({ path: "test-results/race-plan-proposal-1440.png" });
  await sheet.getByRole("button", { name: "Accepter" }).click();
  await expect(page.getByText("Proposition appliquée.")).toBeVisible();
  await expect(sheet).toContainText("Acceptée");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page).not.toHaveURL(/proposal=/);
  await expect(strategy).toContainText(
    "Aucune avance avant le Ravito du Bois : sous 150 bpm.",
  );
  await expect(strategy).not.toContainText("changements proposés");
  await expect(
    timeline.getByRole("article", { name: /^Tronçon T1/ }),
  ).toContainText("Ne prends aucune avance, même si ça te paraît lent.");
  await expect(arrival).toContainText("14:00");
  await page.screenshot({
    path: "test-results/race-plan-1440.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    timeline.getByRole("heading", { name: "Ravito du Bois" }),
  ).toBeVisible();
  await expect(arrival).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Imprimer le roadbook" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/race-plan-390.png",
    fullPage: true,
  });
});

test("the nutrition plan allocates the products and applies a nutritionist proposal", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "athlete@example.com");
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/nutrition");

  const banner = page.getByRole("region", { name: "Plan de nutrition" });
  await expect(banner).toContainText("Nutrition peut ajuster ce plan avec toi");
  await expect(banner).toContainText("2 changements proposés");
  const hours = page.getByRole("region", { name: "Heure par heure" });
  await expect(
    hours.getByRole("list", { name: "Glucides heure par heure" }),
  ).toBeVisible();
  const plan = page.getByRole("region", { name: "Section par section" });
  const first = plan
    .getByRole("listitem")
    .filter({ hasText: /Départ → Ravito du Bois/ });
  await expect(first).toContainText("gels Maurten");
  await expect(first).toContainText("1 flasque iso (1 dose)");
  await expect(first).toContainText(
    "Flasque 1 iso (1 dose) · flasque 2 eau · reprends",
  );
  await expect(
    plan
      .getByRole("listitem")
      .filter({ hasText: /Ravito du Bois → Point d’eau/ }),
  ).toContainText("Flasque 2 eau seulement");
  await expect(page.getByRole("region", { name: "Au départ" })).toContainText(
    "Iso Näak · 1 dose",
  );
  await expect(
    page
      .getByRole("complementary", { name: "Contexte de l’alimentation" })
      .getByRole("region", { name: "Liste de courses" }),
  ).toContainText("Näak Ultra Energy · doses");
  await expect(first.getByText(/^Eau \d+,\d L$/)).toBeVisible();
  await expect(first.getByText(/^Sodium \d+ mg$/)).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Base commune" })
      .getByRole("link", { name: "Nutrition du jour" }),
  ).toHaveAttribute("href", "/health/nutrition");
  await expect(
    page.getByRole("region", { name: "Teste ton ravito" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/race-nutrition-1440.png",
    fullPage: true,
  });

  const products = page.getByRole("region", { name: "Mes produits" });
  await products.getByRole("button", { name: "Ajouter un produit" }).click();
  const dialog = page.getByRole("dialog", { name: "Ajouter un produit" });
  await expect(
    dialog.getByRole("button", { name: "Maurten Gel 100 déjà ajouté" }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Ajouter Näak Barre Ultra Energy" })
    .click();
  await expect(
    page.getByText("Näak Barre Ultra Energy ajouté à tes produits."),
  ).toBeVisible();
  await dialog.getByRole("tab", { name: "Saisie libre" }).click();
  await dialog.getByLabel("Nom").fill("Gel maison");
  await dialog.getByLabel("Glucides par portion (g)").fill("22");
  await dialog.getByRole("button", { name: "Ajouter le produit" }).click();
  await expect(page.getByText("Produit ajouté.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(
    products.getByRole("button", { name: /^Näak Barre Ultra Energy/ }),
  ).toBeVisible();
  await expect(
    products.getByRole("button", { name: /^Gel maison/ }),
  ).toBeVisible();

  await banner.getByRole("link", { name: "Examiner" }).click();
  const sheet = page.getByRole("dialog", { name: "Plan nutrition de course" });
  await expect(sheet).toContainText("Glucides par heure");
  await expect(sheet).toContainText("70 g/h");
  await sheet.getByRole("button", { name: "Accepter" }).click();
  await expect(page.getByText("Proposition appliquée.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page).not.toHaveURL(/proposal=/);
  await expect(banner).toContainText("a préparé ce plan avec toi");
  await expect(banner).not.toContainText("changements proposés");
  await expect(
    page.getByRole("button", { name: /^Glucides 70 g\/h/ }),
  ).toBeVisible();
  await expect(
    plan
      .getByRole("listitem")
      .filter({ hasText: /Ravito du Bois → Point d’eau/ }),
  ).toContainText("Compote au km 15.");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(plan.getByText(/^Au ravito de /).first()).toBeVisible();
  await expect(plan.getByText(/^Eau \d+,\d L$/).first()).toBeVisible();
  await expect(plan.getByText(/^Sodium \d+ mg$/).first()).toBeVisible();
  await page.screenshot({
    path: "test-results/race-nutrition-390.png",
    fullPage: true,
  });
});

test("the gear page edits statuses and the drop bag", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course?base=1`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/gear");

  const readiness = page.getByRole("region", { name: "Préparation" });
  await expect(readiness).toContainText("9 / 17");
  await expect(readiness).toContainText(
    "éléments prêts · 1 à acheter · 1 à tester",
  );
  await expect(
    readiness.getByRole("button", { name: "Imprimer la check-list" }),
  ).toBeVisible();
  const prep = page.getByRole("region", { name: "J-7" });
  await expect(
    prep.getByRole("button", {
      name: "Statut de Tester la tenue complète : À faire",
    }),
  ).toBeVisible();

  const mandatory = page.getByRole("region", { name: "Matériel obligatoire" });
  await mandatory
    .getByRole("button", { name: "Statut de Veste imperméable : À vérifier" })
    .click();
  await page.getByRole("menuitemradio", { name: "Prêt" }).click();
  await expect(page.getByText("Statut : Prêt.")).toBeVisible();
  await expect(readiness).toContainText("10 / 17");
  await expect(
    mandatory.getByRole("checkbox", { name: "Veste imperméable" }),
  ).toBeChecked();

  const bag = page.getByRole("region", { name: "Sac d’allègement" });
  await expect(bag).toContainText("base de vie km 20,0");
  await expect(bag).toContainText("depuis le plan nutrition");
  await bag
    .getByRole("button", { name: "Ajouter un élément à Sac d’allègement" })
    .click();
  await bag
    .getByRole("textbox", { name: "Nouvel élément · Sac d’allègement" })
    .fill("Chaussettes de rechange");
  await bag.getByRole("button", { name: "Ajouter à Sac d’allègement" }).click();
  await expect(page.getByText("Ajouté au sac d’allègement.")).toBeVisible();
  await page.reload();
  await expect(bag).toContainText("Chaussettes de rechange");
  await page.screenshot({
    path: "test-results/race-gear-1440.png",
    fullPage: true,
  });
  await bag
    .getByRole("button", {
      name: "Retirer Chaussettes de rechange du sac d’allègement",
    })
    .click();
  await expect(page.getByText("Retiré du sac d’allègement.")).toBeVisible();
  await expect(bag).not.toContainText("Chaussettes de rechange");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(readiness).toContainText("prêts · 1 à acheter");
  await expect(bag.getByRole("heading")).toHaveAccessibleName(
    "Sac d’allègement · km 20,0",
  );
  await page.screenshot({
    path: "test-results/race-gear-390.png",
    fullPage: true,
  });
});

test("a road 10 km shows only the course and accepts a new start time", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-road`,
  );
  await signInAs(page, "athlete@example.com");
  await page.goto("/races");
  await page.getByRole("link", { name: "Voir le plan de course" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "10 km de Paris" }),
  ).toBeVisible();
  const sections = page.getByRole("navigation", {
    name: "Sections de la course",
  });
  await expect(sections.getByRole("link")).toHaveText([
    "Plan de course",
    "Équipement",
    "Préparation",
  ]);
  await expect(
    page.getByRole("navigation", { name: "Vues du plan de course" }),
  ).toHaveCount(0);
  await expect(page.getByText("Simulation par tronçon")).toHaveCount(0);
  await expect(page.getByText("Marche en pente")).toHaveCount(0);
  await expect(
    page
      .locator("dl > div", { hasText: "Allure moy" })
      .filter({ visible: true }),
  ).toContainText("3:54 /km");
  await page.screenshot({
    path: "test-results/race-road-1440.png",
    fullPage: true,
  });

  const profile = page
    .locator('svg[aria-label^="Profil altimétrique du parcours"]')
    .first();
  await profile.hover({ position: { x: 170, y: 120 } });
  await expect(profile).toHaveAttribute("aria-label", /passage estimé/);
  await profile.focus();
  await profile.press("End");
  await expect(profile).toHaveAttribute("aria-label", /passage estimé/);

  await page
    .getByRole("button", { name: /modifier le départ et l’objectif/ })
    .first()
    .click();
  await page.getByRole("textbox", { name: "Heure de départ" }).fill("09:00");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    page.getByRole("dialog", { name: "Modifier la course" }),
  ).toHaveCount(0, { timeout: 15_000 });
  await expect(
    page.locator("dl > div", { hasText: "Départ" }).first(),
  ).toContainText("09:00", { timeout: 15_000 });

  await sections.getByRole("link", { name: "Préparation" }).click();
  await expect(
    page.getByRole("complementary", { name: "Avant la course" }),
  ).toContainText("Heure de départ");
  await sections.getByRole("link", { name: "Équipement" }).click();
  await expect(
    sections.getByRole("link", { name: "Équipement" }),
  ).toHaveAttribute("aria-current", "page");
  for (const list of ["J-7", "J-1", "Jour J"])
    await expect(
      page.getByText(list, { exact: true }).filter({ visible: true }).first(),
    ).toBeVisible();
  await expect(page.getByText("Obligatoire", { exact: true })).toHaveCount(0);
});

test("a carbohydrate intake validated in training caps the race plan", async ({
  page,
  request,
}) => {
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "athlete@example.com");
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/nutrition");

  const card = page.getByRole("region", { name: "Testé à l’entraînement" });
  await expect(card).toContainText("Aucun apport n’est encore validé");
  await card.getByRole("combobox", { name: "Sortie" }).click();
  await page.getByRole("option", { name: "Autre sortie" }).click();
  await card.getByLabel("Durée").fill("2h20");
  await card.getByLabel("Glucides (g/h)").fill("50");
  await card.getByRole("button", { name: "Validé avec gêne" }).click();
  await card.getByRole("button", { name: "Enregistrer le test" }).click();

  await expect(card).toContainText(
    "Ta cible de 60 g/h est plafonnée à 50 g/h, le plus haut apport validé à l’entraînement.",
  );
  const tests = card.getByRole("list", { name: "Tests de ravitaillement" });
  await expect(tests).toContainText("50 g/h pendant 2h20");
  await expect(tests).toContainText("Validé avec gêne");

  await tests
    .getByRole("button", { name: /^Supprimer le test 50 g\/h/ })
    .click();
  await expect(card).toContainText("Aucun apport n’est encore validé");
});

test("a threatened cutoff offers remedies that apply and undo", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course?tight=1`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

  const alert = page.getByRole("region", {
    name: "Barrière horaire à l’arrivée",
  });
  await expect(alert).toContainText("Marge de 20 min");
  await expect(alert).toContainText(
    "Je te fais arriver à 14:00 pour une barrière à 14:20.",
  );
  await expect(
    page.getByRole("region", { name: "Tes barrières" }),
  ).toContainText("20 min");
  const remedies = alert.getByRole("list", { name: "Réglages proposés" });
  const goal = remedies
    .getByRole("listitem")
    .filter({ hasText: /^Viser \dh\d\d au lieu de 6h00/ });
  await expect(goal).toContainText(/marge (3\d|4\d) min/);
  await goal.getByRole("button", { name: /^Appliquer/ }).click();

  await expect(alert).toBeHidden({ timeout: 15_000 });
  const toast = page
    .locator("[data-sonner-toast]")
    .filter({ hasText: /^Viser / });
  await toast.getByRole("button", { name: "Annuler" }).click();
  await expect(alert).toContainText("Marge de 20 min", { timeout: 15_000 });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    remedies.getByRole("button", { name: /^Appliquer/ }).first(),
  ).toBeVisible();
});

function replacementGpx() {
  const points = Array.from({ length: 29 }, (_, index) => {
    const lat = 48.8 + index * 0.009;
    const lon = 2.3 + Math.sin(index / 4) * 0.01;
    const ele = 100 + index * 2 + Math.sin(index) * 20;
    return `<trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele></trkpt>`;
  });
  return Buffer.from(
    `<?xml version="1.0"?><gpx version="1.1" creator="test" xmlns="http://www.topografix.com/GPX/1/1"><wpt lat="${48.8 + 10 * 0.009}" lon="${2.3 + Math.sin(10 / 4) * 0.01}"><name>Ravito du Bois</name></wpt><trk><name>v2</name><trkseg>${points.join("")}</trkseg></trk></gpx>`,
  );
}

test("replacing the course shows what changes before anything is replaced", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/course");
  const file = {
    name: "ecotrail-v2.gpx",
    mimeType: "application/gpx+xml",
    buffer: replacementGpx(),
  };
  const upload = page
    .locator('input[type="file"][accept*=".gpx"]')
    .filter({ visible: true });
  await upload.setInputFiles(file);

  const preview = page.getByRole("region", { name: "Remplacer le tracé" });
  await expect(preview).toContainText("ecotrail-v2.gpx", { timeout: 20_000 });
  const changes = preview.getByRole("definition");
  await expect(
    changes.filter({ hasText: /^30,0 km → 2[78],\d km$/ }),
  ).toBeVisible();
  await expect(preview).toContainText(
    "Retirés avec l’ancien GPX : Point d’eau",
  );
  await preview.getByRole("button", { name: "Annuler" }).click();
  await expect(preview).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Remplace le GPX de la course" }),
  ).toBeVisible();

  await upload.setInputFiles(file);
  await preview.getByRole("button", { name: "Remplacer" }).click();
  await expect(page.getByText("Tracé remplacé.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page).toHaveURL(
    /\/races\/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb$/,
  );
  await expect(page.getByText(/^2[78],\d km$/).first()).toBeVisible();
});

test("a race without a course reads as an estimate and takes manual aid stations", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course?nocourse=1`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");

  await expect(
    page
      .getByText(
        /^Sans tracé, je travaille avec la distance et le dénivelé annoncés\./,
      )
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dépose le tracé GPX de la course" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Au fil de la course, sans tracé" }),
  ).toBeVisible();
  const roadbook = page.getByRole("region", { name: "Carnet de route" });
  await expect(
    roadbook.getByRole("row", { name: /Départ → Ravito du Bois/ }),
  ).toContainText("≈");
  await expect(
    page.getByRole("region", { name: "Avec et sans tracé" }),
  ).toContainText("Avec le tracé");

  await page.getByRole("link", { name: "Saisir les ravitaillements" }).click();
  await expect(page).toHaveURL(/\/waypoints$/);
  await page.getByRole("button", { name: "+ Ajouter" }).click();
  const editor = page.getByRole("region", { name: "Ajouter un point" });
  await expect(editor.getByText("Kilomètre annoncé")).toBeVisible();
  await editor
    .getByRole("textbox", { name: "Nom", exact: true })
    .fill("Base de Chaville");
  await editor.getByRole("textbox", { name: /^Km/ }).fill("60");
  await editor.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Point enregistré.")).toBeVisible();

  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await expect(
    roadbook.getByRole("row", { name: /→ Base de Chaville/ }),
  ).toBeVisible();
});

test("a waypoint keeps its own planned stop from the table editor", async ({
  page,
  request,
}) => {
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/waypoints");
  const row = page.getByRole("row", { name: /Ravito du Bois/ });
  await expect(row).toContainText("5 min");
  await row.getByRole("button", { name: "Ravito du Bois" }).click();
  const editor = page.getByRole("region", { name: "Modifier Ravito du Bois" });
  await editor.getByRole("textbox", { name: /^Arrêt prévu/ }).fill("12");
  await editor.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Point enregistré.")).toBeVisible();
  await expect(row).toContainText("12 min");
  await editor.getByRole("button", { name: "Annuler" }).click();
  await expect(editor).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("listitem")
    .filter({ hasText: "Ravito du Bois" })
    .getByRole("button")
    .click();
  const sheet = page.getByRole("dialog", { name: "Modifier · Ravito du Bois" });
  await expect(
    sheet.getByRole("textbox", { name: /^Arrêt prévu/ }),
  ).toHaveValue("12");
  await sheet.getByRole("button", { name: "Fermer" }).click();
  await expect(sheet).toBeHidden();
});

test("the plan goes to the watch and into a printable roadbook", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  const firstRow = page
    .getByRole("region", { name: "Carnet de route" })
    .getByRole("row", { name: /Départ → Ravito du Bois/ });
  const passage = (await firstRow.textContent())?.match(/\d\d:\d\d/g)?.at(-1);
  expect(passage).toBeTruthy();

  const takeAlong = page.getByRole("region", { name: "Emporter le plan" });
  await takeAlong
    .getByRole("button", { name: "Envoyer sur la montre" })
    .click();
  const watch = page.getByRole("dialog", { name: "Envoyer sur la montre" });
  await expect(watch).toContainText("Le tracé de 30,0 km, 4 points de passage");
  const download = page.waitForEvent("download");
  await watch
    .getByRole("button", { name: "Télécharger la course .fit" })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.fit$/);
  await expect(page.getByText(/^Course \.fit téléchargé/)).toBeVisible();
  await page.keyboard.press("Escape");

  await takeAlong.getByRole("button", { name: "Carnet de route" }).click();
  const dialog = page.getByRole("dialog", { name: "Carnet de route" });
  const preview = page.frameLocator(
    'iframe[title="Aperçu du carnet de route"]',
  );
  await expect(
    preview.getByRole("heading", { name: "EcoTrail Paris 120K" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    preview.getByRole("row", { name: /Départ → Ravito du Bois/ }),
  ).toContainText(passage!);
  await dialog.getByRole("switch", { name: "Météo" }).click();
  await expect(
    preview.getByRole("columnheader", { name: "Météo" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Bracelet" }).click();
  await expect(preview.getByRole("region", { name: "Bracelet" })).toContainText(
    "Ravito du Bois",
  );
});

test("the crew view says where and when to meet the athlete", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course?crew=1`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
  await page.getByRole("link", { name: "Assistance" }).click();
  await expect(page).toHaveURL(/\/crew$/);
  await expect(
    page.getByText(
      /^Ton assistance peut te voir à un ravito et à l’arrivée\. La fenêtre va de ton scénario ambitieux au prudent/,
    ),
  ).toBeVisible();
  const points = page.getByRole("region", { name: "Où et quand te retrouver" });
  const row = points.getByRole("row", { name: /Ravito du Bois/ });
  await expect(row).toContainText(/\d\d:\d\d – \d\d:\d\d/);
  await row
    .getByRole("button", { name: "Modifier l’assistance à Ravito du Bois" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Ravito du Bois" });
  await dialog
    .getByRole("textbox", { name: "Accès" })
    .fill("Parking du gymnase");
  await dialog
    .getByRole("textbox", { name: "À préparer" })
    .fill("2 flasques iso");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(row).toContainText("Parking du gymnase");
  await expect(row).toContainText("2 flasques iso");

  const gaps = page.getByRole("region", { name: "Sans assistance" });
  await expect(gaps).toContainText("Point d’eau");
  await expect(gaps).toContainText("Assistance non prévue");

  await page.goto(
    "/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/print?sheet=crew",
  );
  await expect(
    page.getByRole("heading", { name: "Feuille d’assistance" }),
  ).toBeVisible();
  await expect(page.getByRole("row", { name: /Ravito du Bois/ })).toContainText(
    "Parking du gymnase",
  );
});

test("the crew follows a secret link that can be replaced or switched off", async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course?crew=1`,
  );
  await signInAs(page, "athlete@example.com");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/crew");
  const linkSwitch = page.getByRole("switch", { name: "Lien de suivi" });
  await expect(
    page.getByText(/^actif du \d+ \S+ au \d+ \S+$/).filter({ visible: true }),
  ).toBeVisible();
  await linkSwitch.click();
  const address = page.getByRole("textbox", {
    name: "Adresse du lien de suivi",
  });
  await expect(address).toHaveValue(/\/crew\/[A-Za-z0-9_-]{32}$/);
  const first = new URL(await address.inputValue(), page.url()).pathname;

  const crew = await browser.newContext();
  const visitor = await crew.newPage();
  await visitor.goto(first);
  await expect(
    visitor.getByRole("heading", { name: "EcoTrail Paris 120K" }),
  ).toBeVisible();
  await expect(
    visitor.getByRole("region", { name: "Où et quand se retrouver" }),
  ).toContainText("Ravito du Bois");
  await expect(visitor.getByText(/FC|fréquence/)).toHaveCount(0);

  await page.getByRole("button", { name: "Créer un nouveau lien" }).click();
  await expect(address).not.toHaveValue(new RegExp(`${first}$`));
  await visitor.goto(first);
  await expect(
    visitor.getByRole("heading", { name: "Ce lien de suivi n’est pas actif" }),
  ).toBeVisible();

  const second = new URL(await address.inputValue(), page.url()).pathname;
  await linkSwitch.click();
  await expect(address).toBeHidden();
  await visitor.goto(second);
  await expect(
    visitor.getByRole("heading", { name: "Ce lien de suivi n’est pas actif" }),
  ).toBeVisible();
  await crew.close();
});
