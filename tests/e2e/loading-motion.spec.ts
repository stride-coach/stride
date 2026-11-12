import { expect, test, type Page } from "@playwright/test";
import { signInAs } from "./support/session";

type Recorded = {
  reveals: { inHeader: boolean; duration: number }[];
  skeletons: string[];
  scopes: number;
};

async function record(page: Page) {
  await page.addInitScript(() => {
    const recorded = { reveals: [], skeletons: [], scopes: 0 } as Recorded;
    Object.assign(window, { __loadingMotion: recorded });
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const frames = JSON.stringify(keyframes);
      if (frames === JSON.stringify([{ opacity: 0 }, { opacity: 1 }]))
        recorded.reveals.push({
          inHeader: this.closest("header") !== null,
          duration:
            typeof options === "object" ? Number(options.duration) : NaN,
        });
      return animate.call(this, keyframes, options);
    };
    new MutationObserver((mutations) => {
      for (const mutation of mutations)
        for (const added of mutation.addedNodes) {
          if (!(added instanceof Element)) continue;
          const scope = '[role="status"][aria-label^="Chargement"]';
          recorded.scopes +=
            Number(added.matches(scope)) + added.querySelectorAll(scope).length;
          for (const skeleton of added.querySelectorAll(
            '[data-slot="skeleton"]',
          ))
            recorded.skeletons.push(getComputedStyle(skeleton).animationName);
        }
    }).observe(document, { childList: true, subtree: true });
  });
}

const authPort = Number(process.env.PLAYWRIGHT_AUTH_PORT ?? 3200);
const delays = `http://127.0.0.1:${authPort}/__test__/rest-delay`;
const planReads = "/rest/v1/plan_proposals?";

test.beforeEach(async () => {
  await fetch(delays, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match: planReads, ms: 1_500 }),
  });
});

test.afterEach(async () => {
  await fetch(`${delays}?match=${encodeURIComponent(planReads)}`, {
    method: "DELETE",
  });
});

async function openPlanSlowly(page: Page) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "plan@example.com");
  await page.getByRole("link", { name: "Plan", exact: true }).first().click();
  await expect(
    page.getByRole("status", { name: "Chargement du plan" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("status", { name: "Chargement du plan" }),
  ).toHaveCount(0);
  return page.evaluate(
    () => (window as unknown as { __loadingMotion: Recorded }).__loadingMotion,
  );
}

test("content fades in over its still skeleton", async ({ page }) => {
  await record(page);
  const recorded = await openPlanSlowly(page);
  expect(recorded.scopes).toBeGreaterThan(0);
  expect(recorded.skeletons.length).toBeGreaterThan(0);
  expect(new Set(recorded.skeletons)).toEqual(new Set(["none"]));
  expect(recorded.reveals.length).toBeGreaterThan(0);
  for (const reveal of recorded.reveals) {
    expect(reveal.inHeader).toBe(false);
    expect(reveal.duration).toBe(150);
  }
});

test(
  "content swaps without fading with reduced motion",
  { tag: "@quarantine" },
  async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await record(page);
    const recorded = await openPlanSlowly(page);
    expect(recorded.scopes).toBeGreaterThan(0);
    expect(recorded.reveals).toEqual([]);
  },
);
