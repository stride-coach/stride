import { expect, test, type Page } from "@playwright/test";

const authPort = Number(process.env.PLAYWRIGHT_AUTH_PORT ?? 3200);

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:${authPort}/__test__/consents`, {
    method: "DELETE",
  });
});

async function signInWithoutConsent(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("E-mail", { exact: true }).fill("consent@example.com");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("TrailMiles2026!");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).toHaveURL("/consent", { timeout: 20_000 });
}

test("an athlete without consent gives it, withdraws it and is held at the consent screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInWithoutConsent(page);

  await expect(
    page.getByRole("heading", { name: "Ton accord pour continuer" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Lire la politique de confidentialité" }),
  ).toHaveAttribute("href", "/privacy");
  const give = page.getByRole("button", { name: "Donner mon accord" });
  await expect(give).toBeDisabled();
  await page.goto("/today");
  await expect(page).toHaveURL("/consent");

  await page
    .getByRole("checkbox", {
      name: /J’accepte que Stride traite mes données de santé/,
    })
    .check();
  await give.click();
  await expect(page).toHaveURL("/today", { timeout: 20_000 });

  await page.goto("/settings/privacy");
  const today = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date());
  await expect(page.getByText(`Accordé le ${today}`)).toBeVisible();
  await expect(
    page.getByText("selon la politique de confidentialité du 24/10/2026", {
      exact: false,
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Retirer mon consentement" }).click();
  const dialog = page.getByRole("alertdialog", {
    name: "Retirer ton consentement ?",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Garder mon accord" }),
  ).toBeFocused();
  await dialog
    .getByRole("button", { name: "Retirer mon consentement" })
    .click();
  await expect(page.getByText("Consentement retiré.")).toBeVisible();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Retiré le ${today}`)).toBeVisible();

  await page.goto("/today");
  await expect(page).toHaveURL("/consent");
  await expect(page.getByText(`Consentement retiré le ${today}`)).toBeVisible();
});

test("athletes who already consented reach the app without the consent screen", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await page.getByLabel("E-mail", { exact: true }).fill("athlete@example.com");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("TrailMiles2026!");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await expect(page).toHaveURL("/today", { timeout: 20_000 });
  await page.goto("/consent");
  await expect(page).toHaveURL("/today");
});
