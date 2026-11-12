import { expect, type Locator, type Page } from "@playwright/test";

export async function clickToUrl(
  page: Page,
  link: Locator,
  url: string | RegExp,
) {
  await expect(async () => {
    await link.click();
    await expect(page).toHaveURL(url, { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}
