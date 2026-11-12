import { expect, type Locator, type Page } from "@playwright/test";

export async function clickUntil(
  target: Locator,
  outcome: () => Promise<void>,
) {
  await expect(async () => {
    await target.click();
    await outcome();
  }).toPass({ timeout: 20_000 });
}

export async function clickToUrl(
  page: Page,
  link: Locator,
  url: string | RegExp,
) {
  await clickUntil(link, () => expect(page).toHaveURL(url, { timeout: 2_000 }));
}
