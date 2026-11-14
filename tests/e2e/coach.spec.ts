import { expect, test, type Page, type Route } from "@playwright/test";
import { signInAs } from "./support/session";

const authPort = Number(process.env.PLAYWRIGHT_AUTH_PORT ?? 3200);
const kneeThread = "c0c0c0c0-0000-4000-8000-000000000001";
const planThread = "c0c0c0c0-0000-4000-8000-000000000002";
const spikeThread = "c0c0c0c0-0000-4000-8000-000000000003";
const mainThread = "c0c0c0c0-0000-4000-8000-000000000004";
const closedTopic = "c0c0c0c0-0000-4000-8000-000000000005";
const newThread = "c0c0c0c0-0000-4000-8000-0000000000aa";
const newPlanProposal = "eeeeeeee-eeee-4eee-8eee-900000000001";
const coachActivity = "aaaaaaaa-aaaa-4aaa-8aaa-000000009101";
const coachRace = "c0ace000-0000-4000-8000-000000000001";
const addContext = "Ajouter du contexte : séance, activité ou course";

test.describe.configure({ mode: "serial" });

async function resetCoach() {
  await fetch(`http://127.0.0.1:${authPort}/__test__/coach`, {
    method: "DELETE",
  });
}

async function coachTurn(update: {
  threadId?: string;
  session: Record<string, unknown>;
  items?: { kind: string; body: Record<string, unknown> }[];
}) {
  const response = await fetch(
    `http://127.0.0.1:${authPort}/__test__/coach-turn`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId: planThread, ...update }),
    },
  );
  expect(response.ok).toBe(true);
}

test.beforeAll(resetCoach);
test.afterAll(resetCoach);

function signIn(page: Page, email = "coach@example.com") {
  return signInAs(page, email);
}

const at = () => new Date().toISOString();

function stream(events: unknown[]) {
  return async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      body: events
        .map((event) => `data: ${JSON.stringify(event)}\n\n`)
        .join(""),
    });
  };
}

function item(kind: string, body: Record<string, unknown>) {
  return { type: "item", item: { kind, at: at(), ...body } };
}

async function expectNotFound(page: Page) {
  await expect(
    page.getByRole("heading", { level: 1, name: "Sujet introuvable" }),
  ).toBeVisible();
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]'),
  ).not.toHaveCount(0);
}

test("the main thread, the topics list and a topic question at 1440", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/today");
  const coachLink = page.getByRole("link", { name: "Coach", exact: true });
  const coachItem = page.locator("li", { has: coachLink }).first();
  await expect(coachItem).toContainText(
    "1 question et 1 proposition en attente",
  );
  await coachLink.click();
  await expect(page).toHaveURL("/coach", { timeout: 20_000 });
  await expect(
    coachItem.getByRole("link", { name: "Conversation" }),
  ).toHaveAttribute("aria-current", "page");
  const sections = page
    .getByRole("navigation", { name: "Sections du Coach" })
    .filter({ visible: true });
  await expect(sections.getByRole("link")).toHaveText([
    "Conversation",
    "Le staff",
  ]);
  const thread = page.getByRole("region", { name: "Fil principal" });
  await expect(
    thread.getByRole("log", { name: "Messages" }).getByText("Belle semaine"),
  ).toBeVisible();

  const topics = page.getByRole("button", { name: "Sujets 2" });
  await topics.click();
  const list = page.getByRole("navigation", {
    name: "Fil principal et sujets",
  });
  await expect(
    list.getByRole("link", { name: /Fil principal/ }),
  ).toHaveAttribute("aria-current", "page");
  const open = list.getByRole("region", { name: "Sujets ouverts" });
  await expect(open.getByRole("link")).toHaveCount(2);
  await expect(
    open.getByRole("link", { name: /Genou en descente/ }),
  ).toContainText("Santé");
  await expect(
    list
      .getByRole("region", { name: "Sujets clos" })
      .getByRole("link", { name: /Tendon d’Achille en descente/ }),
  ).toContainText("clos le");
  await expect(
    list.getByRole("link", { name: /Tendon d’Achille en descente/ }),
  ).toHaveAttribute("href", `/coach/${closedTopic}`);
  await open.getByRole("link", { name: /Genou en descente/ }).click();
  await expect(page).toHaveURL(`/coach/${kneeThread}`, { timeout: 20_000 });
  await expect(
    page.getByRole("heading", { level: 1, name: "Genou en descente" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clore le sujet" }),
  ).toBeVisible();

  const log = page.getByRole("log", { name: "Messages" });
  await expect(log.getByText("@Santé", { exact: true })).toHaveCount(2);
  expect(
    await log
      .locator("span", { hasText: /^@Santé$/ })
      .last()
      .evaluate((element) => getComputedStyle(element).color),
  ).toBe("rgb(36, 86, 230)");
  await expect(log).not.toContainText("Vérifie s’il peut courir");
  await expect(log).not.toContainText("Concertation");
  const question = log.getByRole("group", {
    name: "Comment réagit ton genou en descente ?",
  });
  await expect(question).toContainText("Question de Santé");
  for (const option of [
    "Aucune gêne",
    "Gêne légère, qui passe",
    "Douleur qui m’oblige à ralentir",
    "Autre…",
  ])
    await expect(
      question.getByRole("button", { name: option, exact: true }),
    ).toBeEnabled();
  await expect(log.getByText("A lu")).toBeVisible();
  await expect(log.getByText("Signalements · 14 jours")).toBeVisible();

  const aside = page.getByRole("complementary", { name: "Ce sujet" });
  await expect(aside).toContainText("Mené parSanté");
  await expect(aside).toContainText("AvecCoach");
  await expect(
    aside.getByRole("link", { name: "Revenir au fil principal" }),
  ).toHaveAttribute("href", "/coach");
  await page.screenshot({ path: "test-results/coach-desktop.png" });

  let posted: unknown = null;
  await page.route("**/api/coach/turns", async (route) => {
    posted = route.request().postDataJSON();
    await stream([
      {
        type: "session",
        sessionId: "sesn_01Genou",
        threadId: kneeThread,
        consoleUrl: "https://console.test",
      },
      item("answer", { toolUseId: "sevt_knee", text: "Aucune gêne" }),
      item("staff_message", {
        thread: "sthr_knee",
        agent: "medical",
        text: "@Jules Alors tu peux courir, en gardant les descentes faciles.",
      }),
      item("consult_reply", {
        thread: "sthr_knee",
        agent: "medical",
        text: "Limites pour le plan : descentes faciles jusqu’au 31/10.",
      }),
      item("consult_end", { thread: "sthr_knee", agent: "medical" }),
      item("coach", { text: "Parfait, on garde la sortie longue." }),
      { type: "done", status: "idle" },
    ])(route);
  });
  await question.getByRole("button", { name: "Aucune gêne" }).click();
  await expect(
    log.getByText("Parfait, on garde la sortie longue."),
  ).toBeVisible();
  await expect(log.getByText("En réponse à Santé")).toBeVisible();
  await expect(log.getByText("Alors tu peux courir")).toBeVisible();
  await expect(log).not.toContainText("Limites pour le plan");
  await expect(question).toContainText("Répondue");
  await expect(
    question.getByRole("button", { name: "Aucune gêne" }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(posted).toEqual({
    target: { kind: "topic", threadId: kneeThread },
    mode: "conversation",
    input: { kind: "answer", toolUseId: "sevt_knee", text: "Aucune gêne" },
  });
});

test("a main-thread message asks Santé and stays in the main thread", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/coach");
  let posted: unknown = null;
  await page.route("**/api/coach/turns", async (route) => {
    posted = route.request().postDataJSON();
    await stream([
      {
        type: "session",
        sessionId: "sesn_01Fil",
        threadId: mainThread,
        consoleUrl: "https://console.test",
      },
      item("athlete", { text: "Mon mollet est tendu", consult: "medical" }),
      item("coach", { text: "@Santé, tu peux regarder ton mollet ?" }),
      item("consult_request", {
        thread: "sthr_calf",
        agent: "medical",
        text: "Calf tightness, any risk?",
      }),
      item("read", {
        thread: "sthr_calf",
        agent: "medical",
        tool: "get_hrv_data",
        label: "Garmin · VFC",
      }),
      item("consult_reply", {
        thread: "sthr_calf",
        agent: "medical",
        text: "@Jules Risque faible, reste en facile.",
      }),
      item("consult_end", { thread: "sthr_calf", agent: "medical" }),
      item("coach", {
        text: "**Santé est rassurante** : on reste en facile.\n\n- footing\n- étirements",
      }),
      { type: "done", status: "idle" },
    ])(route);
  });
  const composer = page.getByRole("textbox", { name: "Écrire au staff" });
  await composer.fill("Mon mollet est tendu");
  await page.getByRole("button", { name: "Mentionner Santé" }).click();
  await page.getByRole("button", { name: "Envoyer" }).click();

  const log = page.getByRole("log", { name: "Messages" });
  await expect(
    log.locator("strong", { hasText: "Santé est rassurante" }),
  ).toBeVisible();
  await expect(page).toHaveURL("/coach");
  await expect(log.getByText("Belle semaine")).toBeVisible();
  await expect(
    log.getByRole("listitem").filter({ hasText: "footing" }),
  ).toBeVisible();
  await expect(log).not.toContainText("**");
  await expect(log.getByText("Risque faible, reste en facile.")).toBeVisible();
  await expect(log.getByText("Garmin · VFC")).toBeVisible();
  await expect(log).not.toContainText("Calf tightness");
  expect(posted).toEqual({
    target: { kind: "main" },
    mode: "conversation",
    input: {
      kind: "message",
      text: "Mon mollet est tendu",
      consult: "medical",
    },
  });
});

test("a new topic keeps its messages apart and closes into a summary card", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/coach");
  await page.getByRole("button", { name: "Nouveau sujet" }).click();
  const dialog = page.getByRole("dialog", { name: "Nouveau sujet" });
  await dialog.getByRole("button", { name: "Préparer une course" }).click();
  await expect(
    dialog.getByRole("textbox", { name: "De quoi veux-tu parler ?" }),
  ).toHaveValue("Préparer une course");
  await dialog.getByRole("radio", { name: "Course · Trail des Lacs" }).click();
  await dialog.getByRole("button", { name: "Ouvrir le sujet" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Préparer une course" }),
  ).toBeVisible();
  const aside = page.getByRole("complementary", { name: "Ce sujet" });
  await expect(aside).toContainText("Lié àTrail des Lacs");
  await expect(aside).toContainText("Mené parCoach");

  let posted: unknown = null;
  await page.route("**/api/coach/turns", async (route) => {
    posted = route.request().postDataJSON();
    await fetch(`http://127.0.0.1:${authPort}/__test__/coach-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: {
          id: newThread,
          managed_session_id: "sesn_01Sujet",
          title: "Préparer une course",
          race_id: coachRace,
          last_turn_at: at(),
          last_activity_at: at(),
          read_at: at(),
          created_at: at(),
        },
      }),
    });
    await coachTurn({
      threadId: newThread,
      session: {},
      items: [
        {
          kind: "athlete",
          body: {
            text: "Quelle allure viser ?",
            consult: null,
            attachments: [],
          },
        },
        {
          kind: "staff_message",
          body: {
            thread: "sthr_pace",
            agent: "strategist",
            text: "Pars à 6:10 par kilomètre sur le plat.",
          },
        },
        { kind: "coach", body: { text: "On en reparle après ta sortie." } },
      ],
    });
    await stream([
      {
        type: "session",
        sessionId: "sesn_01Sujet",
        threadId: newThread,
        consoleUrl: "https://console.test",
      },
      item("athlete", {
        text: "Quelle allure viser ?",
        consult: null,
        attachments: [],
      }),
      item("staff_message", {
        thread: "sthr_pace",
        agent: "strategist",
        text: "Pars à 6:10 par kilomètre sur le plat.",
      }),
      item("coach", { text: "On en reparle après ta sortie." }),
      { type: "done", status: "idle" },
    ])(route);
  });
  const composer = page.getByRole("textbox", { name: "Écrire au staff" });
  await composer.fill("Quelle allure viser ?");
  await composer.press("Enter");
  await expect(page).toHaveURL(`/coach/${newThread}`, { timeout: 20_000 });
  expect(posted).toEqual({
    target: {
      kind: "new_topic",
      title: "Préparer une course",
      raceId: coachRace,
    },
    mode: "conversation",
    input: { kind: "message", text: "Quelle allure viser ?" },
  });
  await expect(aside).toContainText("Mené parStratège de course");
  await expect(aside).toContainText("AvecCoach");
  await page.unrouteAll({ behavior: "ignoreErrors" });

  await page.getByRole("button", { name: "Clore le sujet" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Clore le sujet" })
    .click();
  await expect(page.getByText(/^Ce sujet est clos\./)).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    page.getByRole("textbox", { name: "Écrire au staff" }),
  ).toHaveCount(0);

  await page.goto("/coach");
  const log = page.getByRole("log", { name: "Messages" });
  const card = log.locator('[data-slot="widget"]', {
    hasText: "Sujet clos · Préparer une course",
  });
  await expect(card).toContainText("Aucune décision");
  await expect(card).toContainText("3 messages");
  await expect(
    card.getByRole("link", { name: "Relire le sujet" }),
  ).toHaveAttribute("href", `/coach/${newThread}`);
  await expect(log).not.toContainText("Quelle allure viser ?");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(card).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await card.getByRole("link", { name: "Relire le sujet" }).click();
  await expect(page).toHaveURL(`/coach/${newThread}`, { timeout: 20_000 });
  await expect(page.getByText(/^Ce sujet est clos\./)).toBeVisible();
});

test("a refused turn shows a French message and keeps the draft", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${planThread}`);
  await page.route("**/api/coach/turns", (route) =>
    route.fulfill({ status: 409, json: { code: "turn_in_progress" } }),
  );
  const composer = page.getByRole("textbox", { name: "Écrire au staff" });
  await composer.fill("Et la semaine prochaine ?");
  await composer.press("Enter");
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Le staff travaille déjà sur ta demande." }),
  ).toBeVisible();
  await expect(composer).toHaveValue("Et la semaine prochaine ?");
});

test("suggested replies send from the keyboard and hide while the staff works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${kneeThread}`);
  await expect(
    page.getByRole("log", { name: "Messages" }).getByText("Question de Santé"),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Réponses suggérées" }),
  ).toHaveCount(0);

  await page.goto(`/coach/${planThread}`);
  const row = page.getByRole("group", { name: "Réponses suggérées" });
  const replies = row.getByRole("button");
  await expect(replies).toHaveText([
    "Pourquoi ce changement ?",
    "Quel impact sur ma semaine ?",
    "Propose une autre option",
  ]);
  const replyStyle = await replies.first().evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.minHeight, style.fontSize];
  });
  expect(replyStyle).toEqual(["32px", "13px"]);
  await page.screenshot({ path: "test-results/coach-replies-desktop.png" });

  let posted: unknown = null;
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/coach/turns", async (route) => {
    posted = route.request().postDataJSON();
    await gate;
    await stream([
      item("athlete", {
        text: "Propose une autre option",
        consult: null,
        attachments: [],
      }),
      item("coach", { text: "Je te prépare une variante plus douce." }),
      { type: "done", status: "idle" },
    ])(route);
  });
  const composer = page.getByRole("textbox", { name: "Écrire au staff" });
  await composer.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  const other = row.getByRole("button", { name: "Propose une autre option" });
  await expect(other).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Le Coach réfléchit…" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Arrêter le staff" }),
  ).toHaveCount(0);
  await expect(row).toHaveCount(0);
  await expect(composer).toHaveValue("");
  expect(posted).toEqual({
    target: { kind: "topic", threadId: planThread },
    mode: "plan",
    input: { kind: "message", text: "Propose une autre option" },
  });
  release();
  await expect(
    page
      .getByRole("log", { name: "Messages" })
      .getByText("Je te prépare une variante plus douce."),
  ).toBeVisible();
  await expect(row).toBeVisible();
});

test("suggested replies scroll at 390 and restore a failed reply", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto(`/coach/${planThread}`);
  const row = page.getByRole("group", { name: "Réponses suggérées" });
  const first = row.getByRole("button").first();
  await expect(first).toBeVisible();
  const reply = await first.evaluate((element) => {
    const style = getComputedStyle(element);
    return [
      element.getBoundingClientRect().height,
      style.borderTopLeftRadius,
      style.transitionProperty,
    ];
  });
  expect(reply[0]).toBeGreaterThanOrEqual(44);
  expect(reply[1]).not.toBe("8px");
  expect(reply[2]).toBe("none");
  const scroll = await row.evaluate((element) => ({
    overflow: element.scrollWidth > element.clientWidth,
    left: Math.round(element.getBoundingClientRect().left),
    right: Math.round(element.getBoundingClientRect().right),
  }));
  expect(scroll).toEqual({ overflow: true, left: 0, right: 390 });
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/coach-replies-mobile.png" });

  await page.route("**/api/coach/turns", (route) =>
    route.fulfill({ status: 409, json: { code: "turn_in_progress" } }),
  );
  await row.getByRole("button", { name: "Pourquoi ce changement ?" }).click();
  await expect(
    page
      .locator("[data-sonner-toast]")
      .filter({ hasText: "Le staff travaille déjà sur ta demande." }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Écrire au staff" }),
  ).toHaveValue("Pourquoi ce changement ?");
  await expect(row).toBeVisible();
});

test("context chips are picked with the keyboard, survive a failed send and reach the staff", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/coach");
  const trigger = page.getByRole("button", { name: addContext });
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await trigger.click();
  const picker = page.getByRole("dialog", { name: "Ajouter du contexte" });
  await expect(picker).toBeVisible();
  await expect
    .poll(async () => {
      const box = await picker.boundingBox();
      return box && [Math.round(box.x + box.width), Math.round(box.width)];
    })
    .toEqual([1440, 440]);
  const tabs = picker.getByRole("tablist", { name: "Type de contexte" });
  const sessions = tabs.getByRole("tab", { name: "Séances" });
  await sessions.click();
  await expect(sessions).toHaveAttribute("aria-selected", "true");
  await expect(sessions).toBeFocused();
  await expect(
    picker.getByText(
      "Aucune séance prévue autour d’aujourd’hui dans ton plan actif.",
    ),
  ).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Activités" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("ArrowRight");
  const races = tabs.getByRole("tab", { name: "Courses" });
  await expect(races).toHaveAttribute("aria-selected", "true");
  await expect(races).toBeFocused();
  const race = picker.getByRole("button", { name: /Trail des Lacs/ });
  await expect(race).toContainText("50 km · 2 400 m D+");
  await page.keyboard.press("Tab");
  if (!(await race.evaluate((element) => element === document.activeElement)))
    await page.keyboard.press("Tab");
  await expect(race).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(race).toHaveAttribute("aria-pressed", "true");
  await expect(picker.getByRole("status")).toHaveText("1 élément joint sur 3");
  await page.keyboard.press("Escape");
  await expect(picker).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await picker.getByRole("tab", { name: "Activités" }).click();
  const activity = picker.getByRole("button", {
    name: /Sortie longue vallonnée/,
  });
  await expect(activity).toContainText("24,6 km · 680 m D+");
  await activity.click();
  await activity.click();
  await expect(activity).toHaveAttribute("aria-pressed", "false");
  await activity.click();
  await expect(picker.getByRole("status")).toHaveText(
    "2 éléments joints sur 3",
  );
  const others = picker.locator('button[aria-pressed="false"]');
  await others.first().click();
  await expect(picker.getByRole("status")).toHaveText("3 éléments au plus");
  await expect(others.first()).toBeDisabled();
  await picker.getByRole("button", { name: "Terminé" }).click();
  await expect(picker).toBeHidden();

  const chips = page.getByRole("list", { name: "Contexte joint au message" });
  await expect(chips.getByRole("listitem")).toHaveCount(3);
  const extra = chips.getByRole("listitem").nth(2);
  const extraTitle = (await extra.innerText()).split("\n")[0];
  await extra.getByRole("button", { name: /^Retirer / }).click();
  const composer = page.getByRole("textbox", { name: "Écrire au staff" });
  await expect(composer).toBeFocused();
  await expect(chips.getByRole("listitem")).toHaveCount(2);
  await expect(chips).not.toContainText(extraTitle);

  await page.route("**/api/coach/turns", (route) =>
    route.fulfill({ status: 500, json: { code: "failed" } }),
  );
  await composer.fill("Analyse ça");
  await composer.press("Enter");
  await expect(
    page.locator("[data-sonner-toast]").filter({
      hasText: "Le message n’a pas pu être envoyé.",
    }),
  ).toBeVisible();
  await expect(composer).toHaveValue("Analyse ça");
  await expect(chips.getByRole("listitem")).toHaveCount(2);

  await page.unroute("**/api/coach/turns");
  const attachments = [
    { kind: "race", id: coachRace },
    { kind: "activity", id: coachActivity },
  ];
  let posted: unknown = null;
  await page.route("**/api/coach/turns", async (route) => {
    posted = route.request().postDataJSON();
    await stream([
      {
        type: "session",
        sessionId: "sesn_01Fil",
        threadId: mainThread,
        consoleUrl: "https://console.test",
      },
      item("athlete", {
        text: "Analyse ça",
        consult: null,
        attachments: [
          {
            ...attachments[0],
            title: "Trail des Lacs",
            date: "2027-06-27",
          },
          {
            ...attachments[1],
            title: "Sortie longue vallonnée",
            date: "2026-10-04",
          },
        ],
      }),
      item("coach", { text: "Je regarde ta sortie." }),
      { type: "done", status: "idle" },
    ])(route);
  });
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(chips).toBeHidden();
  expect(posted).toEqual({
    target: { kind: "main" },
    mode: "conversation",
    input: { kind: "message", text: "Analyse ça", attachments },
  });
  const sent = page
    .getByRole("log", { name: "Messages" })
    .getByRole("list", { name: "Contexte joint" });
  await expect(
    sent.getByRole("link", { name: /Trail des Lacs/ }),
  ).toHaveAttribute("href", `/races/${coachRace}`);
  await expect(
    sent.getByRole("link", { name: /Sortie longue vallonnée/ }),
  ).toHaveAttribute("href", `/activities/${coachActivity}`);
  await expect(sent).toContainText("27/06/2027");
});

test("a stored message keeps its chips and answer mode hides the context control", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${kneeThread}`);
  const sent = page
    .getByRole("log", { name: "Messages" })
    .getByRole("list", { name: "Contexte joint" });
  await expect(
    sent.getByRole("link", { name: /Sortie longue vallonnée/ }),
  ).toHaveAttribute("href", `/activities/${coachActivity}`);
  await expect(
    page.getByRole("textbox", { name: "Ta réponse au staff" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: addContext })).toHaveCount(0);
});

test("mobile picks context from a bottom sheet at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/coach");
  const trigger = page.getByRole("button", { name: addContext });
  const triggerBox = await trigger.boundingBox();
  expect(Math.round(triggerBox!.height)).toBeGreaterThanOrEqual(40);
  await trigger.focus();
  await page.keyboard.press("Enter");
  const picker = page.getByRole("dialog", { name: "Ajouter du contexte" });
  await expect(picker).toBeVisible();
  await expect
    .poll(async () => {
      const box = await picker.boundingBox();
      return box && [Math.round(box.width), Math.round(box.y + box.height)];
    })
    .toEqual([390, 844]);
  await picker.getByRole("tab", { name: "Courses" }).click();
  await picker.getByRole("button", { name: /Trail des Lacs/ }).click();
  await picker.getByRole("button", { name: "Terminé" }).click();
  const chips = page.getByRole("list", { name: "Contexte joint au message" });
  const remove = chips.getByRole("button", {
    name: "Retirer Trail des Lacs du contexte",
  });
  const removeBox = await remove.boundingBox();
  expect(Math.round(removeBox!.height)).toBe(44);
  expect(Math.round(removeBox!.width)).toBe(44);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await remove.click();
  await expect(chips).toBeHidden();
  await expect(
    page.getByRole("textbox", { name: "Écrire au staff" }),
  ).toBeFocused();
});

test("a new-plan proposal opens the review sheet and activates without an active plan", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${planThread}`);
  const card = page.getByRole("log", { name: "Messages" });
  await expect(card.getByText("Proposition · Nouveau plan")).toBeVisible();
  await expect(card.getByText("À toi de décider")).toBeVisible();
  await card.getByRole("link", { name: "Examiner" }).click();
  await expect(page).toHaveURL(new RegExp(`proposal=${newPlanProposal}`), {
    timeout: 20_000,
  });
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Premier plan")).toBeVisible();
  await sheet.getByRole("button", { name: "Activer ce plan" }).click();
  await expect(
    sheet.getByText("Appliquée · ton nouveau plan est actif"),
  ).toBeVisible({ timeout: 20_000 });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`/coach/${planThread}`);
  await page.reload();
  await expect(
    page.getByRole("log", { name: "Messages" }).getByText("Appliquée"),
  ).toBeVisible();
});

test("a reload keeps the topic", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${kneeThread}`);
  const log = page.getByRole("log", { name: "Messages" });
  const before = (await log.textContent()) ?? "";
  await page.reload();
  await expect(log).toHaveText(before);
  await expect(
    log.getByRole("button", { name: "Aucune gêne", exact: true }),
  ).toBeEnabled();
});

test("a main-thread link from a notification opens the main thread", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(`/coach/${mainThread}`);
  await expect(page).toHaveURL("/coach", { timeout: 20_000 });
  await expect(
    page.getByRole("log", { name: "Messages" }).getByText("Belle semaine"),
  ).toBeVisible();
});

test("another athlete's thread is not found", async ({ page }) => {
  await signIn(page, "plan-review@example.com");
  await page.goto(`/coach/${kneeThread}`);
  await expectNotFound(page);
});

test("an untitled empty legacy session is never shown", async ({ page }) => {
  await signIn(page);
  await page.goto(`/coach/${spikeThread}`);
  await expectNotFound(page);
});

test("the Plan empty state asks the Coach for a plan", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/plan");
  await page.getByRole("link", { name: "Demander un plan" }).click();
  await expect(page).toHaveURL("/coach?request=plan");
  await expect(
    page.getByRole("textbox", { name: "Écrire au staff" }),
  ).toHaveValue("Construis-moi un plan d’entraînement pour mon objectif.");
  await page.goto("/coach/new?request=plan");
  await expect(page).toHaveURL("/coach?request=plan");
  await expect(
    page.getByRole("textbox", { name: "Écrire au staff" }),
  ).toHaveValue("Construis-moi un plan d’entraînement pour mon objectif.");
});

test("a prefilled request starts the composer with its text", async ({
  page,
}) => {
  await signIn(page);
  await page.goto(
    `/coach/new?text=${encodeURIComponent("Ma fatigue dépasse ma condition. Peux-tu alléger ma semaine ?")}`,
  );
  await expect(
    page.getByRole("textbox", { name: "Écrire au staff" }),
  ).toHaveValue(
    "Ma fatigue dépasse ma condition. Peux-tu alléger ma semaine ?",
  );
  await page.goto(`/coach/new?text=${"a".repeat(600)}`);
  await expect(
    page.getByRole("textbox", { name: "Écrire au staff" }),
  ).toHaveValue("a".repeat(500));
});

async function watchFind(page: Page) {
  await page.evaluate(() => {
    const state = window as unknown as { findPrevented?: boolean | null };
    state.findPrevented = null;
    function watch(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "f") return;
      window.removeEventListener("keydown", watch);
      window.setTimeout(() => {
        state.findPrevented = event.defaultPrevented;
      });
    }
    window.addEventListener("keydown", watch);
  });
  await page.keyboard.press("ControlOrMeta+f");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { findPrevented?: boolean | null })
            .findPrevented,
      ),
    )
    .not.toBeNull();
  return page.evaluate(
    () =>
      (window as unknown as { findPrevented?: boolean | null }).findPrevented,
  );
}

test("search walks the main thread and a closed topic at 1440", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/today");
  expect(await watchFind(page)).toBe(false);

  await page.goto("/coach");
  const log = page.getByRole("log", { name: "Messages" });
  await expect(log.getByText("Belle semaine")).toBeVisible();
  await expect.poll(() => watchFind(page)).toBe(true);
  const input = page.getByRole("searchbox", {
    name: "Rechercher dans la conversation",
  });
  await expect(input).toBeFocused();
  await input.fill("TENDON");
  await expect(page).toHaveURL(/\/coach\?q=TENDON&at=\d+$/, {
    timeout: 20_000,
  });
  const bar = page.getByRole("search", {
    name: "Rechercher dans la conversation",
  });
  const counter = bar.getByRole("status");
  await expect(counter).toHaveText("3 sur 3");
  const current = log.locator('[data-search-current="true"]');
  await expect(current).toContainText("Je garde un œil sur ton tendon.");
  await expect(current).toBeInViewport();
  await expect(log.locator("mark")).toHaveText(["tendon", "tendon"]);
  await expect(
    bar.getByRole("button", { name: "Résultat suivant" }),
  ).toBeDisabled();

  const panel = page.getByRole("complementary", {
    name: "Résultats de la recherche",
  });
  await expect(
    panel.getByRole("heading", { name: "3 résultats pour « TENDON »" }),
  ).toBeVisible();
  const rows = panel.getByRole("list").getByRole("link");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText("Coach");
  await expect(rows.nth(0)).toHaveAttribute("aria-current", "true");
  await expect(rows.nth(1)).toContainText("Toi");
  await expect(rows.nth(2)).toContainText(
    "Sujet clos · Tendon d’Achille en descente",
  );
  await expect(rows.nth(2)).toContainText("2 messages");
  await expect(panel).toContainText(
    "La recherche couvre tout ce que tu as échangé avec le staff, y compris les sujets clos.",
  );

  await bar.getByRole("button", { name: "Résultat précédent" }).click();
  await expect(counter).toHaveText("2 sur 3");
  await expect(current).toContainText("Mon tendon va mieux");

  await bar.getByRole("button", { name: "Aller à une date" }).click();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(new Date());
  await page.getByLabel("Aller à une date").fill(today);
  await page.getByRole("button", { name: "Aller", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`date=${today}`), {
    timeout: 20_000,
  });
  await expect(log.getByText("Mon tendon va mieux")).toBeInViewport();
  await expect(counter).toHaveText("2 sur 3");

  await bar.getByRole("button", { name: "Résultat précédent" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/coach/${closedTopic}\\?q=TENDON&at=\\d+$`),
    { timeout: 20_000 },
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Tendon d’Achille en descente",
    }),
  ).toBeVisible();
  await expect(counter).toHaveText("1 sur 3");
  await expect(current).toContainText("Mon tendon tire en descente.");
  await expect(
    bar.getByRole("button", { name: "Résultat précédent" }),
  ).toBeDisabled();
  await expect(rows.nth(2)).toHaveAttribute("aria-current", "true");

  await panel.getByRole("button", { name: "Fil principal" }).click();
  await expect(
    panel.getByRole("heading", { name: "1 résultat pour « TENDON »" }),
  ).toBeVisible();
  await expect(counter).toHaveText("1 sur 1");
  await expect(page).toHaveURL(/scope=topics/);
  await expect(rows).toHaveCount(1);

  await input.press("Escape");
  await expect(page).toHaveURL(`/coach/${closedTopic}`, { timeout: 20_000 });
  await expect(bar).toHaveCount(0);
  await expect(log.locator("mark")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Rechercher", exact: true }),
  ).toBeFocused();
});

test("search keeps only its bar on a phone at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/coach");
  await page.getByRole("button", { name: "Rechercher", exact: true }).click();
  const bar = page.getByRole("search", {
    name: "Rechercher dans la conversation",
  });
  await bar
    .getByRole("searchbox", { name: "Rechercher dans la conversation" })
    .fill("tendon");
  await expect(bar.getByRole("status")).toHaveText("3 sur 3", {
    timeout: 20_000,
  });
  await expect(
    bar.getByRole("button", { name: "Résultat précédent" }),
  ).toBeVisible();
  await expect(
    bar.getByRole("button", { name: "Résultat suivant" }),
  ).toBeVisible();
  await expect(bar.getByRole("button", { name: "Fermer" })).toBeVisible();
  await expect(
    bar.getByRole("button", { name: "Aller à une date" }),
  ).toBeHidden();
  await expect(
    page.getByRole("complementary", { name: "Résultats de la recherche" }),
  ).toBeHidden();
  await expect(
    page
      .getByRole("log", { name: "Messages" })
      .locator('[data-search-current="true"]'),
  ).toBeInViewport();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await bar.getByRole("button", { name: "Fermer" }).click();
  await expect(page).toHaveURL("/coach", { timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "Rechercher", exact: true }),
  ).toBeFocused();
});

test("mobile shows the main thread, the topics sheet and a topic at 390", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/coach");
  await expect(
    page.getByRole("log", { name: "Messages" }).getByText("Belle semaine"),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navigation principale" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Fil principal\s*2 sujets/ }).click();
  const sheet = page.getByRole("dialog", { name: "Sujets" });
  await expect(sheet.getByRole("link", { name: /Tendon/ })).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Nouveau sujet" }),
  ).toBeVisible();
  await sheet.getByRole("link", { name: /Genou en descente/ }).click();
  await expect(page).toHaveURL(`/coach/${kneeThread}`, { timeout: 20_000 });
  const log = page.getByRole("log", { name: "Messages" });
  await expect(log.getByText("Question de Santé")).toBeVisible();
  await expect(
    log.getByRole("button", { name: "Aucune gêne", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/coach-mobile.png" });
  await page.getByRole("button", { name: "Ce sujet" }).click();
  const aside = page.getByRole("dialog", { name: "Ce sujet" });
  await expect(aside).toContainText("Mené parSanté");
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.keyboard.press("Escape");
  await page.goto(`/coach/${planThread}`);
  const card = page.getByRole("log", { name: "Messages" });
  await expect(card.getByText("Proposition · Nouveau plan")).toBeVisible();
  await expect(
    card.getByRole("link", { name: /^(Examiner|Voir la proposition)$/ }),
  ).toBeVisible();
  const cardWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(cardWidth).toBeLessThanOrEqual(390);
});

test("mobile tab bar reaches the main screens and stays in a topic", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/coach");
  const tabs = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(tabs).toBeVisible();
  const coach = tabs.getByRole("link", { name: /^Coach, .+ en attente$/ });
  await expect(coach).toHaveAttribute("aria-current", "page");
  await expect(coach.locator('[data-kind="dot"]')).toBeAttached();
  const box = await tabs.boundingBox();
  expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(832);
  const composer = await page
    .getByRole("textbox", { name: "Écrire au staff" })
    .boundingBox();
  expect((composer?.y ?? 0) + (composer?.height ?? 0)).toBeLessThanOrEqual(
    box?.y ?? 0,
  );

  await tabs.getByRole("link", { name: "Aujourd’hui" }).focus();
  await page.keyboard.press("Tab");
  const plan = tabs.getByRole("link", { name: "Plan" });
  await expect(plan).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/plan/, { timeout: 20_000 });
  await expect(plan).toHaveAttribute("aria-current", "page");
  await expect(tabs.getByRole("link", { name: /^Coach/ })).not.toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto(`/coach/${kneeThread}`);
  await expect(page.getByRole("log", { name: "Messages" })).toBeVisible();
  await expect(tabs).toBeVisible();

  await page.goto("/coach/team");
  await expect(tabs.getByRole("link", { name: /^Coach/ })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goto("/activities");
  const scrolled = () =>
    page.evaluate(() =>
      Math.max(
        ...[...document.querySelectorAll("[data-slot=sidebar-inset] *")].map(
          (element) => element.scrollTop,
        ),
      ),
    );
  await page.evaluate(() => {
    for (const element of document.querySelectorAll(
      "[data-slot=sidebar-inset] *",
    ))
      if (element.scrollHeight > element.clientHeight + 10)
        element.scrollTop = element.scrollHeight;
  });
  expect(await scrolled()).toBeGreaterThan(0);
  await tabs.getByRole("link", { name: "Activités" }).click();
  await expect.poll(scrolled).toBe(0);
  await expect(page).toHaveURL(/\/activities$/);

  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(tabs).toBeHidden();
});

test("reduced motion stops the live indicators", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${kneeThread}`);
  const animated = await page.evaluate(
    () =>
      [...document.querySelectorAll("main, [role=log], aside, body *")].filter(
        (element) => getComputedStyle(element).animationName !== "none",
      ).length,
  );
  expect(animated).toBe(0);
});

test("deleting a topic asks for confirmation and refreshes the badge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${kneeThread}`);
  await page.getByRole("button", { name: "Plus d’options" }).click();
  await page.getByRole("menuitem", { name: "Supprimer le sujet" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Supprimer le sujet ?");
  await dialog.getByRole("button", { name: "Annuler" }).click();
  await expect(page).toHaveURL(`/coach/${kneeThread}`);

  await page.getByRole("button", { name: "Plus d’options" }).click();
  await page.getByRole("menuitem", { name: "Supprimer le sujet" }).click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Supprimer" })
    .click();
  await expect(page).toHaveURL("/coach", { timeout: 20_000 });
  await page.getByRole("button", { name: /^Sujets/ }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Fil principal et sujets" })
      .getByRole("link", { name: /Genou en descente/ }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  const coachLink = page.getByRole("link", { name: "Coach", exact: true });
  await expect(
    page.locator("li", { has: coachLink }).first(),
  ).not.toContainText("en attente");
  await page.goto(`/coach/${kneeThread}`);
  await expectNotFound(page);
});

test("the topic menu offers renaming, closing and deletion on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto(`/coach/${planThread}`);
  await page.getByRole("button", { name: "Plus d’options" }).click();
  for (const name of ["Renommer", "Clore le sujet", "Supprimer le sujet"])
    await expect(page.getByRole("menuitem", { name })).toBeVisible();
});

test("the staff page shows five roles without faces and names them everywhere", async ({
  page,
}) => {
  await resetCoach();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto("/coach");
  const coachLink = page.getByRole("link", { name: "Coach", exact: true });
  const coachItem = page.locator("li", { has: coachLink }).first();
  await coachItem.getByRole("link", { name: "Le staff" }).click();
  await expect(page).toHaveURL("/coach/team", { timeout: 20_000 });
  await expect(
    coachItem.getByRole("link", { name: "Le staff" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page
      .getByRole("navigation", { name: "Sections du Coach" })
      .filter({ visible: true })
      .getByRole("link", { name: "Le staff" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Cinq rôles, une seule conversation",
    }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(5);
  const coach = page.getByRole("article", { name: "Coach" });
  await expect(coach).toContainText("Ton entraînement au quotidien");
  await expect(coach).toContainText("3 conversations ce mois");
  await expect(coach.locator('[data-slot="staff-avatar"]')).toBeVisible();
  await expect(
    coach.getByRole("link", { name: "Écrire au Coach" }),
  ).toBeVisible();
  await expect(page.getByRole("article", { name: "Santé" })).toContainText(
    "1 avis ce mois",
  );
  for (const name of ["Directeur sportif", "Stratège de course", "Nutrition"])
    await expect(
      page.getByRole("article", { name, exact: true }),
    ).toBeVisible();
  await expect(page.getByRole("group", { name: /^Visage/ })).toHaveCount(0);
  await expect(page.getByRole("main").locator("img")).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Comment le staff travaille" }),
  ).toBeVisible();
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(1440);
  await page.screenshot({
    path: "test-results/coach-team.png",
    fullPage: true,
  });

  await page.goto(`/coach/${kneeThread}`);
  await expect(
    page.getByRole("complementary", { name: "Ce sujet" }),
  ).toContainText("Mené parSanté");
  await expect(
    page.getByRole("log", { name: "Messages" }).getByText("Question de Santé"),
  ).toBeVisible();
});

test("mobile reaches the staff page from the topics sheet at 390", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page);
  await page.goto("/coach");
  await page.getByRole("button", { name: /^Fil principal/ }).click();
  await page.getByRole("link", { name: "Voir le staff", exact: true }).click();
  await expect(page).toHaveURL("/coach/team", { timeout: 20_000 });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Cinq rôles, une seule conversation",
    }),
  ).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(5);
  await expect(page.getByRole("group", { name: /^Visage/ })).toHaveCount(0);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/coach-team-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Retour au fil principal" }).click();
  await expect(page).toHaveURL("/coach", { timeout: 20_000 });
});

test("a refresh during a turn keeps the staff working and shows its result", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await signIn(page);
  await page.goto(`/coach/${planThread}`);
  await page.route("**/api/coach/turns", () => new Promise<void>(() => {}));
  const request = "Prolonge mon plan jusqu’à l’EcoTrail 120K.";
  const composer = page.getByRole("textbox", { name: "Écrire au staff" });
  await composer.fill(request);
  await composer.press("Enter");
  await expect(
    page.getByRole("status").filter({ hasText: "Le Coach réfléchit…" }),
  ).toBeVisible();

  await coachTurn({
    session: {
      status: "running",
      last_turn_at: at(),
      composing_since: new Date(Date.now() - 3 * 60_000 - 5_000).toISOString(),
    },
    items: [
      {
        kind: "athlete",
        body: { text: request, consult: null, attachments: [] },
      },
    ],
  });
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await page.reload();

  const log = page.getByRole("log", { name: "Messages" });
  await expect(log.getByText(request)).toBeVisible();
  const working = page
    .getByRole("status")
    .filter({ hasText: "Le Coach rédige sa réponse…" });
  await expect(working).toContainText("depuis 3 min");
  await expect(working).toContainText(
    "Tu peux quitter la page : le staff continue et sa réponse t’attendra ici.",
  );
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Arrêter le staff" }),
  ).toHaveCount(0);

  await coachTurn({
    session: { status: "idle", composing_since: null },
    items: [
      {
        kind: "coach",
        body: { text: "J’ai ajouté les semaines jusqu’à l’EcoTrail 120K." },
      },
    ],
  });
  await expect(
    log.getByText("J’ai ajouté les semaines jusqu’à l’EcoTrail 120K."),
  ).toBeVisible({ timeout: 15_000 });
  await expect(working).toHaveCount(0);
  await composer.fill("Merci");
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await resetCoach();
});
