import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

test("the theme follows the system by default, switches from the account menu and persists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await signInAs(page, "athlete@example.com");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "light");

  const account = page.getByRole("button", { name: /^Jules Profil/ });
  const choose = async (label: string) => {
    await account.click();
    await page.getByRole("menuitemradio", { name: label }).click();
  };
  await account.click();
  await expect(
    page.getByRole("menuitemradio", { name: "Système" }),
  ).toBeChecked();
  await page.getByRole("menuitemradio", { name: "Sombre" }).click();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await choose("Clair");
  await expect(root).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");
  await account.click();
  await expect(
    page.getByRole("menuitemradio", { name: "Clair" }),
  ).toBeChecked();
  await page.getByRole("menuitemradio", { name: "Système" }).click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-theme", "dark");
});
