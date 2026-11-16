import { describe, expect, it } from "vitest";
import {
  blocksInputSchema,
  cardScale,
  cardText,
  dataCardSchema,
  linkTargets,
  linkDestinations,
  resolveBlocks,
  resolveCard,
} from "../../src/features/coach/blocks";
import { parseThreadItem } from "../../src/features/coach/items";
import {
  buildThread,
  previewText,
  type StaffBlock,
} from "../../src/features/coach/thread";
import type { ThreadItem } from "../../src/features/coach/items";

const at = "2026-11-16T06:14:00.000Z";

const reading = (
  last: number,
  range: { low: number; high: number } | null,
) => ({
  last,
  lastDay: "2026-11-16",
  range,
  median: 58,
  points: [],
  position: null,
});

describe("resolveCard", () => {
  it("fills the card from the stored reading and range", () => {
    const card = resolveCard("hrv", {
      hrv: reading(46, { low: 52, high: 64 }),
      restingHeartRate: null,
    });
    expect(card).toMatchObject({
      value: 46,
      low: 52,
      high: 64,
      position: "below",
    });
    expect(cardText(card!)).toEqual({
      label: "VFC nocturne",
      value: "46 ms",
      range: "52–64 ms",
      verdict: "Sous ta plage",
    });
  });

  it("drops the card without a stored value or a personal range", () => {
    expect(
      resolveCard("hrv", { hrv: null, restingHeartRate: null }),
    ).toBeNull();
    expect(
      resolveCard("hrv", { hrv: reading(46, null), restingHeartRate: null }),
    ).toBeNull();
    expect(
      resolveCard("resting_heart_rate", {
        hrv: reading(46, { low: 52, high: 64 }),
        restingHeartRate: null,
      }),
    ).toBeNull();
  });

  it("reports what was dropped to the agent", () => {
    const { blocks, shown, dropped } = resolveBlocks(
      { card: "hrv", replies: ["Pourquoi ?"] },
      null,
    );
    expect(blocks.card).toBeNull();
    expect(shown).toEqual(["replies"]);
    expect(dropped).toEqual(["card"]);
  });

  it("scales the range around the value", () => {
    const card = resolveCard("hrv", {
      hrv: reading(46, { low: 52, high: 64 }),
      restingHeartRate: null,
    })!;
    const scale = cardScale(card);
    expect(scale.min).toBeLessThan(46);
    expect(scale.max).toBeGreaterThan(64);
  });
});

describe("data card validation", () => {
  const card = {
    metric: "hrv",
    value: 46,
    low: 52,
    high: 64,
    position: "below",
    day: "2026-11-16",
  };

  it("rejects an inverted range, a wrong position and a non-finite value", () => {
    expect(dataCardSchema.safeParse(card).success).toBe(true);
    expect(dataCardSchema.safeParse({ ...card, low: 70 }).success).toBe(false);
    expect(
      dataCardSchema.safeParse({ ...card, position: "within" }).success,
    ).toBe(false);
    expect(dataCardSchema.safeParse({ ...card, value: Infinity }).success).toBe(
      false,
    );
    expect(dataCardSchema.safeParse({ ...card, metric: "vo2" }).success).toBe(
      false,
    );
  });
});

describe("blocks input", () => {
  it("accepts only closed destinations and bounded choices", () => {
    expect(blocksInputSchema.safeParse({ links: ["plan"] }).success).toBe(true);
    expect(
      blocksInputSchema.safeParse({ links: ["https://example.com"] }).success,
    ).toBe(false);
    expect(blocksInputSchema.safeParse({ choices: ["Un seul"] }).success).toBe(
      false,
    );
    expect(blocksInputSchema.safeParse({}).success).toBe(false);
    expect(blocksInputSchema.safeParse({ card: "sleep" }).success).toBe(false);
  });

  it("keeps every destination on an internal path", () => {
    for (const destination of linkDestinations)
      expect(linkTargets[destination].href).toMatch(/^\/[a-z]/);
  });
});

describe("blocks item", () => {
  const row = (body: Record<string, unknown>) =>
    parseThreadItem({ kind: "blocks", body, created_at: at });

  it("drops an invalid card and unknown destinations when read back", () => {
    const item = row({
      agent: "medical",
      card: {
        metric: "hrv",
        value: 46,
        low: 70,
        high: 64,
        position: "below",
        day: "2026-11-16",
      },
      choices: ["Décaler à jeudi", "", 4, "Décaler à jeudi"],
      links: ["calendar", "javascript:alert(1)", "plan", "today"],
      replies: ["Pourquoi ?", "a".repeat(80)],
    });
    expect(item).toMatchObject({
      kind: "blocks",
      card: null,
      choices: ["Décaler à jeudi"],
      links: ["calendar", "plan"],
      replies: ["Pourquoi ?"],
    });
  });

  it("requires a staff agent", () => {
    expect(row({ agent: "nobody", card: null })).toBeNull();
  });
});

describe("buildThread with blocks", () => {
  const items: ThreadItem[] = [
    {
      kind: "athlete",
      at,
      text: "Et si je décale ?",
      consult: null,
      attachments: [],
    },
    {
      kind: "staff_message",
      at,
      thread: "t",
      agent: "medical",
      text: "Je confirme.",
    },
    {
      kind: "blocks",
      at,
      agent: "medical",
      card: {
        metric: "hrv",
        value: 46,
        low: 52,
        high: 64,
        position: "below",
        day: "2026-11-16",
      },
      choices: ["Décaler à jeudi", "Garder aujourd’hui"],
      links: ["calendar"],
      replies: [],
    },
  ];

  function blocksOf(input: ThreadItem[], live = false) {
    const staff = buildThread({
      items: input,
      live,
      pendingToolUseId: null,
    }).find((entry) => entry.type === "staff");
    return staff?.type === "staff" ? staff.blocks : [];
  }

  it("attaches the blocks to the message of the same agent", () => {
    expect(blocksOf(items).map((block: StaffBlock) => block.type)).toEqual([
      "text",
      "data_card",
      "choices",
      "links",
    ]);
  });

  it("keeps choices open only until the athlete answers or the staff works", () => {
    const choices = (input: ThreadItem[], live?: boolean) =>
      blocksOf(input, live).find((block) => block.type === "choices");
    expect(choices(items)).toMatchObject({ open: true });
    expect(choices(items, true)).toMatchObject({ open: false });
    expect(
      choices([
        ...items,
        {
          kind: "athlete",
          at,
          text: "Décaler à jeudi",
          consult: null,
          attachments: [],
        },
      ]),
    ).toMatchObject({ open: false });
  });
});

describe("typing preview", () => {
  it("shows the first sentence of the brief without identifiers", () => {
    expect(
      previewText(
        "Vérifie ce que le décalage change à ta sortie longue. Course 0f8a1c52-1111-4222-8333-444455556666.",
      ),
    ).toBe("Vérifie ce que le décalage change à ta sortie longue…");
  });

  it("shortens a long brief and ignores an empty one", () => {
    expect(previewText("a ".repeat(100))!.length).toBeLessThanOrEqual(91);
    expect(previewText("   ")).toBeNull();
  });
});
