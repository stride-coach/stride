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
    await axis.focus();
    await axis.press("End");
    await expect(axis).toHaveAttribute("aria-valuetext", /^km 30, /);
    await expect(cursor).toContainText("km 30 ·");
    await axis.press("Home");
    await expect(axis).toHaveAttribute("aria-valuetext", /^km 0, /);
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
    const row = page.getByRole("button", { name: /Ravito du Bois/ });
    await expect(row).toContainText("km 10,0");
    await expect(row).toContainText("Alerte");
    await row.click();
    await expect(row).toHaveAttribute("aria-current", "true");
    const editor = page.getByRole("region", {
      name: "Modifier Ravito du Bois",
    });
    await expect(
      editor.getByRole("heading", { name: "Modifier · Ravito du Bois" }),
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
  await expect(
    page.getByRole("link", { name: /^Cible · 6h00/ }),
  ).toHaveAttribute("aria-current", "true");
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
  const plan = page.getByRole("region", { name: "Plan par tronçon" });
  const first = plan.getByRole("row", { name: /Départ → Ravito du Bois/ });
  await expect(first).toContainText("gels Maurten");
  await expect(first).toContainText("1 flasque iso (1 dose)");
  await expect(first).toContainText(
    "Flasque 1 iso (1 dose) · flasque 2 eau · reprends",
  );
  await expect(
    plan.getByRole("row", { name: /Ravito du Bois → Point d’eau/ }),
  ).toContainText("Flasque 2 eau seulement");
  await expect(page.getByRole("region", { name: "Au départ" })).toContainText(
    "Iso Näak · 1 dose",
  );
  await expect(
    page
      .getByRole("complementary", { name: "Contexte de l’alimentation" })
      .getByRole("region", { name: "Liste de courses" }),
  ).toContainText("Näak Ultra Energy · doses");
  await expect(first.getByText(/^\d+,\d L · \d+ mg$/)).toBeVisible();
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
    plan.getByRole("row", { name: /Ravito du Bois → Point d’eau/ }),
  ).toContainText("Compote au km 15.");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(plan.getByText(/^Au ravito : /).first()).toBeVisible();
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
    page.locator("dl > div", { hasText: "Allure moy" }),
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
    page.getByRole("region", { name: "Suis-je dans les temps ?" }),
  ).toBeVisible();
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
