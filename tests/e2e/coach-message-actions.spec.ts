import { expect, test } from "@playwright/test";
import { signInAs } from "./support/session";

const authPort = Number(process.env.PLAYWRIGHT_AUTH_PORT ?? 3200);
const topic = "c0c0c0c0-0000-4000-8000-0000000000b2";

async function post(path: string, body: unknown) {
  const response = await fetch(`http://127.0.0.1:${authPort}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  expect(response.ok).toBe(true);
}

test.beforeEach(async () => {
  await fetch(`http://127.0.0.1:${authPort}/__test__/coach`, {
    method: "DELETE",
  });
});

test("a staff message is copied, shows what was read and takes a correction", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const now = new Date().toISOString();
  await post("/__test__/coach-session", {
    session: {
      id: topic,
      managed_session_id: "sesn_01Actions",
      title: "Charge de la semaine",
      last_turn_at: now,
      last_activity_at: now,
      read_at: now,
      created_at: now,
    },
  });
  await post("/__test__/coach-turn", {
    threadId: topic,
    session: {},
    items: [
      {
        kind: "athlete",
        body: {
          text: "Ma charge est-elle bonne ?",
          consult: null,
          attachments: [],
        },
      },
      {
        kind: "read",
        body: {
          thread: "main",
          agent: "coach",
          tool: "read_active_plan",
          label: "Plan · 28 jours",
        },
      },
      { kind: "coach", body: { text: "Ta charge est stable cette semaine." } },
    ],
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await signInAs(page, "coach@example.com");
  await page.goto(`/coach/${topic}`);

  const log = page.getByRole("log", { name: "Messages" });
  const message = log.getByText("Ta charge est stable cette semaine.");
  await message.hover();
  const actions = page.getByRole("toolbar", { name: "Actions sur le message" });
  await expect(actions).toBeVisible();

  await actions.getByRole("button", { name: "Copier" }).click();
  await expect(page.getByText("Message copié.")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "Ta charge est stable cette semaine.",
  );

  await message.hover();
  await actions.getByRole("button", { name: "Ce qui a été lu" }).click();
  await expect(page.getByText("Pour répondre, le staff a lu")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByText("Plan · 28 jours"),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await message.hover();
  await actions.getByRole("button", { name: "Ce n’est pas juste" }).click();
  const field = page.getByRole("textbox", {
    name: "Qu’est-ce qui n’est pas juste ?",
  });
  const send = page.getByRole("button", { name: "Envoyer la correction" });
  await expect(send).toBeDisabled();
  await field.fill("J’ai eu mal au genou mardi.");
  await send.click();
  await expect(
    page.getByText("Correction envoyée. Le staff en tiendra compte."),
  ).toBeVisible();

  const stored = await (
    await fetch(`http://127.0.0.1:${authPort}/__test__/coach-corrections`)
  ).json();
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({
    text: "J’ai eu mal au genou mardi.",
    excerpt: "Ta charge est stable cette semaine.",
  });
});
