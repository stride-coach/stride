import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

const authUrl = `http://127.0.0.1:${process.env.PLAYWRIGHT_AUTH_PORT ?? 3200}`;
const worn = "d1000000-0000-4000-8000-000000000004";

async function resetShoes() {
  const reset = await fetch(`${authUrl}/__test__/athlete-shoes`, {
    method: "DELETE",
  });
  expect(reset.ok).toBe(true);
}

test.beforeEach(resetShoes);
test.afterEach(resetShoes);

test("a worn pair is replaced by a fresh one at 0 km", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "athlete@example.com");
  await page.goto(`/activities/gear/${worn}`);
  await page
    .getByRole("link", { name: "Remplacer par une paire neuve" })
    .click();

  await expect(
    page.getByRole("heading", { name: "Remplacer ACG Zegama" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByLabel("Marque")).toHaveValue("Nike");
  await expect(page.getByLabel("Modèle")).toHaveValue("ACG Zegama");
  await expect(page.getByLabel("Durée de vie")).toHaveValue("800");
  await expect(
    page.getByText(/puis retire ta ACG Zegama actuelle/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Remplacer la paire" }).click();
  await expect(page.getByText("Paire remplacée.")).toBeVisible({
    timeout: 20_000,
  });
  await expect(page).toHaveURL(
    /\/activities\/gear\/(?!d1000000-0000-4000-8000-000000000004)[0-9a-f-]{36}$/,
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "ACG Zegama" }),
  ).toBeVisible();
  await expect(
    page.getByText("/ 800 km · 0 % de la durée de vie"),
  ).toBeVisible();

  await page.goto("/activities/gear");
  await expect(page.getByText("Paires retirées · 1")).toBeVisible({
    timeout: 20_000,
  });

  await page.goto(`/activities/gear/${worn}`);
  await expect(page.getByText(/^Retirée le /)).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("link", { name: "Remplacer par une paire neuve" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Remettre en service" }),
  ).toBeVisible();
});
