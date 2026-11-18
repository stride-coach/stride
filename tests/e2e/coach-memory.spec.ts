import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

const authPort = Number(process.env.PLAYWRIGHT_AUTH_PORT ?? 3200);

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:${authPort}/__test__/coach`, {
    method: "DELETE",
  });
});

test("the athlete adds, corrects, forgets and clears what the staff knows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "coach@example.com");
  await page.goto("/coach");
  await page
    .getByRole("navigation", { name: "Sections du Coach" })
    .filter({ visible: true })
    .getByRole("link", { name: "Ce que je sais de toi" })
    .click();
  await expect(page).toHaveURL("/coach/memory", { timeout: 20_000 });
  await expect(page.getByText("Tu n’as encore rien ajouté.")).toBeVisible();

  const add = page.getByRole("button", { name: "Ajouter une information" });
  await add.first().click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Ce que le staff doit savoir" })
    .fill("Sortie longue le dimanche");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  const habits = page.getByRole("region", { name: "Tes habitudes" });
  await expect(habits.getByText("Sortie longue le dimanche")).toBeVisible();
  await expect(habits.getByText(/^Tu l’as dit · \d+ \S+$/)).toBeVisible();

  await add.first().click();
  await dialog
    .getByRole("textbox", { name: "Ce que le staff doit savoir" })
    .fill("Déplacement sans tapis");
  await dialog.getByRole("radio", { name: "À venir" }).click();
  await dialog.getByLabel("Du").fill("2026-12-20");
  await dialog.getByLabel("Au").fill("2026-12-24");
  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  const upcoming = page.getByRole("region", { name: "À venir" });
  await expect(upcoming.getByText("du 20 déc. au 24 déc.")).toBeVisible();

  await habits
    .getByRole("button", { name: "Corriger : Sortie longue le dimanche" })
    .click();
  const field = dialog.getByRole("textbox", {
    name: "Ce que le staff doit savoir",
  });
  await expect(field).toHaveValue("Sortie longue le dimanche");
  await field.fill("Sortie longue le samedi");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(habits.getByText("Sortie longue le samedi")).toBeVisible();
  await expect(habits.getByText(/Tu l’as dit · corrigé le/)).toBeVisible();

  const exported = await page.request.get("/api/coach/memory/export");
  expect(exported.headers()["content-disposition"]).toContain("attachment");
  expect(
    (await exported.json()).facts.map((fact: { text: string }) => fact.text),
  ).toEqual(["Sortie longue le samedi", "Déplacement sans tapis"]);

  await upcoming
    .getByRole("button", { name: "Oublier : Déplacement sans tapis" })
    .click();
  await expect(page.getByText("Déplacement sans tapis")).toHaveCount(0);

  await page.getByRole("button", { name: "Tout effacer" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(
    confirm.getByText("Le staff oubliera cette information."),
  ).toBeVisible();
  await confirm.getByRole("button", { name: "Tout effacer" }).click();
  await expect(page.getByText("Tu n’as encore rien ajouté.")).toBeVisible();
});

test("the athlete confirms, corrects and counts what the staff observed", async ({
  page,
}) => {
  const seed = (fact: Record<string, string>) =>
    fetch(`http://127.0.0.1:${authPort}/__test__/coach-fact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fact),
    });
  await seed({
    category: "body",
    text: "Tu récupères moins bien après deux nuits de moins de 6 h",
    origin: "observed",
    basis: "6 semaines de données",
  });
  await seed({
    category: "habit",
    text: "En semaine, tu cours avant 7:30",
    origin: "observed",
    basis: "5 semaines de données",
  });
  await seed({ category: "habit", text: "Sortie longue le dimanche" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "coach@example.com");
  await page.goto("/coach/memory");

  const body = page.getByRole("region", { name: "Ton corps" });
  await expect(body.getByText("Observé · 6 semaines de données")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Confirmer :/ })).toHaveCount(
    2,
  );
  await expect(
    page
      .getByRole("region", { name: "Tes habitudes" })
      .getByText(/^Tu l’as dit · \d+ \S+$/),
  ).toBeVisible();

  await body
    .getByRole("button", {
      name: "Confirmer : Tu récupères moins bien après deux nuits de moins de 6 h",
    })
    .click();
  await expect(body.getByText(/^Confirmé · \d+ \S+$/)).toBeVisible();
  await expect(body.getByRole("button", { name: /^Confirmer :/ })).toHaveCount(
    0,
  );

  const habits = page.getByRole("region", { name: "Tes habitudes" });
  await habits
    .getByRole("button", { name: "Corriger : En semaine, tu cours avant 7:30" })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Ce que le staff doit savoir" })
    .fill("En semaine, tu cours avant 8:00");
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await expect(
    habits.getByText("En semaine, tu cours avant 8:00"),
  ).toBeVisible();
  await expect(habits.getByText(/Tu l’as dit · corrigé le/)).toBeVisible();
  await expect(habits.getByText(/^Observé ·/)).toHaveCount(0);

  await page.getByRole("button", { name: "Tout effacer" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm.getByText("Ce que tu lui as dit")).toBeVisible();
  await expect(confirm.getByText("Ce qu’il a observé")).toBeVisible();
  await confirm.getByRole("button", { name: "Annuler" }).click();
});

test("on a phone the add button sits under the list and the last action stays reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signInAs(page, "coach@example.com");
  await page.goto("/coach/memory");
  const add = page
    .getByRole("button", { name: "Ajouter une information" })
    .filter({ visible: true });
  await expect(add).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Sur toi" }).filter({ visible: true }),
  ).toHaveAttribute("aria-current", "page");

  for (let index = 1; index <= 6; index += 1) {
    await add.click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("textbox", { name: "Ce que le staff doit savoir" })
      .fill(`Information numéro ${index}`);
    await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
    await expect(dialog).toBeHidden();
  }
  await page
    .getByRole("button", { name: "Tout effacer" })
    .filter({ visible: true })
    .click({ timeout: 10_000 });
  await expect(page.getByRole("alertdialog")).toBeVisible();
});
