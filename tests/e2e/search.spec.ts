import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

test("an athlete finds a race and a session from anywhere with the keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "plan@example.com");
  await page.goto("/activities");
  await expect(
    page.getByRole("button", { name: /Rechercher une séance, une course/ }),
  ).toBeVisible();

  await page.keyboard.press("ControlOrMeta+K");
  const search = page.getByRole("dialog", { name: "Rechercher dans Stride" });
  await expect(search.getByRole("option", { name: "Courses" })).toBeVisible();

  const input = search.getByRole("combobox");
  await input.fill("marahton");
  const races = search.getByRole("group", { name: /Courses/ });
  const race = races.getByRole("option").first();
  await expect(race).toContainText("Marathon de Paris");
  await page.keyboard.press("Tab");
  await expect(race).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/races\/[0-9a-f-]+$/);
  await expect(search).toHaveCount(0);

  await page.keyboard.press("/");
  await expect(
    search
      .getByRole("group", { name: "Récents" })
      .getByRole("option", { name: /Marathon de Paris/ }),
  ).toBeVisible();

  await input.fill("seuil");
  const sessions = search.getByRole("group", { name: /Séances/ });
  await expect(sessions.getByRole("option").first()).toContainText(
    "Seuil · 4 × 6’",
  );
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("");
  await input.fill("seuil");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/plan\/sessions\//);
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.keyboard.press("ControlOrMeta+K");
  await input.fill("lactate");
  await expect(
    search.getByText("Rien ne correspond à « lactate »"),
  ).toBeVisible();
  await expect(
    search.getByRole("option", { name: /Demander au coach : « lactate »/ }),
  ).toBeVisible();
});
