import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

const authPort = Number(process.env.PLAYWRIGHT_AUTH_PORT ?? 3200);
const longThread = "c0c0c0c0-0000-4000-8000-0000000000b1";
const total = 130;

async function resetCoach() {
  await fetch(`http://127.0.0.1:${authPort}/__test__/coach`, {
    method: "DELETE",
  });
}

async function post(path: string, body: unknown) {
  const response = await fetch(`http://127.0.0.1:${authPort}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(response.ok).toBe(true);
}

test.beforeEach(resetCoach);
test.afterAll(resetCoach);

test("a long thread opens on what is unread, loads older messages in place and returns to the bottom", async ({
  page,
}) => {
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  await post("/__test__/coach-session", {
    session: {
      id: longThread,
      managed_session_id: "sesn_01Long",
      title: "Un long fil",
      last_turn_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      read_at: hourAgo,
      created_at: hourAgo,
    },
  });
  await post("/__test__/coach-turn", {
    threadId: longThread,
    session: {},
    items: Array.from({ length: total }, (_, index) => {
      const number = index + 1;
      return number % 2 === 1
        ? {
            kind: "athlete",
            body: {
              text: `Question ${number}`,
              consult: null,
              attachments: [],
            },
          }
        : { kind: "coach", body: { text: `Réponse ${number}` } };
    }),
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await signInAs(page, "coach@example.com");
  await page.goto(`/coach/${longThread}`);

  const log = page.getByRole("log", { name: "Messages" });
  await expect(log.getByText("30 nouveaux messages")).toBeInViewport();
  await expect(log.getByText("Réponse 130")).not.toBeInViewport();
  await expect(log.getByText("Réponse 70")).toHaveCount(0);

  await page.getByRole("button", { name: /Revenir en bas/ }).click();
  await expect(log.getByText("Réponse 130")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: /Revenir en bas/ }),
  ).toHaveCount(0);

  const firstLoaded = log.getByText("Question 71");
  await firstLoaded.scrollIntoViewIfNeeded();
  const before = (await firstLoaded.boundingBox())?.y ?? 0;
  await page
    .getByRole("button", { name: "Charger les messages précédents" })
    .click();
  await expect(log.getByText("Réponse 70")).toBeAttached();
  const after = (await firstLoaded.boundingBox())?.y ?? 0;
  expect(Math.abs(after - before)).toBeLessThan(4);

  await page
    .getByRole("button", { name: "Charger les messages précédents" })
    .click();
  await expect(log.getByText("Question 1", { exact: true })).toBeAttached();
  await expect(
    page.getByRole("button", { name: "Charger les messages précédents" }),
  ).toHaveCount(0);
});
