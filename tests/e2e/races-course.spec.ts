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
    await page.getByRole("link", { name: "Ouvrir la course" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "EcoTrail Paris 120K" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /^4 points/ })).toHaveAttribute(
      "href",
      "/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/waypoints",
    );
    const pace = page.locator("dl > div", { hasText: "Allure moy" });
    await expect(pace).toContainText("12:00 /km");
    const onTrack = page.getByRole("region", {
      name: "Suis-je dans les temps ?",
    });
    await expect(onTrack).toBeVisible();
    await expect(
      onTrack.getByText("pas de prévision fiable en ultra"),
    ).toBeVisible();
    await expect(page.getByText("Météo du jour J")).toHaveCount(0);
    const margin = page.locator("dl > div", { hasText: "Marge barrière" });
    if (viewport.width < 500) await expect(margin).toContainText("2h");
    else await expect(margin).toBeHidden();
    await expect(
      page.getByRole("link", { name: "Poser une question" }).first(),
    ).toHaveAttribute(
      "href",
      "/coach/new?race=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    );
    const chart = page
      .locator('svg[aria-label^="Profil altimétrique"]:visible')
      .first();
    const aid = chart.locator('g[aria-label^="Ravito du Bois"]');
    await aid.locator("circle").first().hover();
    await expect(
      page.getByText("Ravito du Bois", { exact: true }),
    ).toBeVisible();
    await expect(chart.getByText("Ravito du Bois")).toHaveCount(0);
    await chart.focus();
    await chart.press("End");
    await expect(chart).toHaveAttribute("aria-label", /Km 30,0/);
    await aid.focus();
    await expect(
      page.getByText("Ravito du Bois", { exact: true }),
    ).toBeVisible();
    await expect
      .poll(() =>
        aid.evaluate((element) => getComputedStyle(element).outlineStyle),
      )
      .toBe("none");
    await expect
      .poll(() =>
        chart.evaluate((element) => getComputedStyle(element).outlineStyle),
      )
      .toBe("none");
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
    ).toBeVisible();
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

test("the plan de course follows the timeline and applies a strategy proposal", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  await request.post(
    `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}/__test__/race-course`,
  );
  await signInAs(page, "athlete@example.com");
  await page.goto("/races/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/roadbook");

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
  await page.getByRole("link", { name: "Ouvrir la course" }).click();

  await expect(
    page.getByRole("heading", { level: 1, name: "10 km de Paris" }),
  ).toBeVisible();
  const sections = page.getByRole("navigation", {
    name: "Sections de la course",
  });
  await expect(sections.getByRole("link")).toHaveText([
    "Course",
    "Check-lists",
  ]);
  await expect(page.getByText("Simulation par tronçon")).toHaveCount(0);
  await expect(page.getByText("Marche en pente")).toHaveCount(0);
  await expect(
    page.locator("dl > div", { hasText: "Allure moy" }),
  ).toContainText("3:54 /km");
  await expect(
    page.getByRole("region", { name: "Suis-je dans les temps ?" }),
  ).toBeVisible();
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

  const raceUrl = page.url();
  await page.goto(`${raceUrl}/preparation`);
  await expect(page).toHaveURL(`${raceUrl}/gear`);
  await expect(
    sections.getByRole("link", { name: "Check-lists" }),
  ).toHaveAttribute("aria-current", "page");
  for (const list of ["J-7", "J-1", "Jour J"])
    await expect(page.getByText(list, { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Obligatoire", { exact: true })).toHaveCount(0);
});
