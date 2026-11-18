import { describe, expect, it, vi } from "vitest";
import type { OnboardingContext } from "../../src/server/onboarding/context";

vi.mock("server-only", () => ({}));

import { runCustomTool } from "../../src/server/coaching/tools/registry";

const athlete = "a0000000-0000-4000-8000-00000000000a";
const factId = "f0000000-0000-4000-8000-00000000000f";

type Result = { data: unknown; error: { message: string } | null };
type Call = { table: string; steps: unknown[][] };

function clientWith(results: Result[]) {
  const calls: Call[] = [];
  const queue = [...results];
  const client = {
    from(table: string) {
      const call: Call = { table, steps: [] };
      calls.push(call);
      const result = queue.shift() ?? { data: [], error: null };
      const builder: object = new Proxy(
        {},
        {
          get(_target, property: string) {
            if (property === "then")
              return (resolve: (value: Result) => void) => resolve(result);
            return (...args: unknown[]) => {
              call.steps.push([property, ...args]);
              return builder;
            };
          },
        },
      );
      return builder;
    },
  };
  return {
    calls,
    context: { userId: athlete, client } as unknown as OnboardingContext,
  };
}

const row = (overrides: Record<string, unknown> = {}) => ({
  id: factId,
  category: "habit",
  text: "Tu cours avant 7:30 en semaine",
  starts_on: null,
  ends_on: null,
  origin: "observed",
  basis: "5 semaines de données",
  confirmed_at: null,
  created_at: "2026-11-18T08:00:00Z",
  updated_at: "2026-11-18T08:00:00Z",
  ...overrides,
});

const observation = {
  category: "habit",
  text: "Tu cours avant 7:30 en semaine",
  source: "observed",
  basis: "5 semaines de données",
};

describe("record_athlete_fact", () => {
  it("records an observation with its basis for the athlete only", async () => {
    const { calls, context } = clientWith([
      { data: [], error: null },
      { data: row(), error: null },
    ]);
    const outcome = await runCustomTool(
      context,
      "record_athlete_fact",
      observation,
    );
    expect(outcome).toEqual({
      ok: true,
      content: {
        created: true,
        fact: {
          id: factId,
          category: "habit",
          text: "Tu cours avant 7:30 en semaine",
          status: "observed",
        },
      },
    });
    expect(calls[1].steps[0]).toEqual([
      "insert",
      expect.objectContaining({
        user_id: athlete,
        origin: "observed",
        basis: "5 semaines de données",
      }),
    ]);
  });

  it("records what the athlete said without a basis", async () => {
    const { calls, context } = clientWith([
      { data: [], error: null },
      { data: row({ origin: "said", basis: null }), error: null },
    ]);
    const outcome = await runCustomTool(context, "record_athlete_fact", {
      category: "habit",
      text: "Tu cours avant 7:30 en semaine",
      source: "said",
    });
    expect(outcome).toMatchObject({
      ok: true,
      content: { fact: { status: "said" } },
    });
    expect(calls[1].steps[0]).toEqual([
      "insert",
      expect.objectContaining({ origin: "said", basis: null }),
    ]);
  });

  it("returns the existing fact instead of recording a duplicate", async () => {
    const { calls, context } = clientWith([
      {
        data: [row({ text: "tu cours  avant 7:30 en semaine " })],
        error: null,
      },
    ]);
    const outcome = await runCustomTool(
      context,
      "record_athlete_fact",
      observation,
    );
    expect(outcome).toMatchObject({
      ok: true,
      content: { created: false, fact: { id: factId } },
    });
    expect(calls).toHaveLength(1);
  });

  it("turns an unconfirmed observation into what the athlete said", async () => {
    const { calls, context } = clientWith([
      { data: [row()], error: null },
      { data: row({ origin: "said", basis: null }), error: null },
    ]);
    const outcome = await runCustomTool(context, "record_athlete_fact", {
      category: "habit",
      text: "Tu cours avant 7:30 en semaine",
      source: "said",
    });
    expect(outcome).toMatchObject({
      ok: true,
      content: { created: false, fact: { id: factId, status: "said" } },
    });
    expect(calls[1].steps[0]).toEqual([
      "update",
      { origin: "said", basis: null, confirmed_at: null },
    ]);
  });

  it("refuses an observation without a basis and a statement with one", async () => {
    const { calls, context } = clientWith([]);
    expect(
      (
        await runCustomTool(context, "record_athlete_fact", {
          ...observation,
          basis: undefined,
        })
      ).content,
    ).toMatchObject({ code: "invalid_input" });
    expect(
      (
        await runCustomTool(context, "record_athlete_fact", {
          ...observation,
          source: "said",
        })
      ).content,
    ).toMatchObject({ code: "invalid_input" });
    expect(calls).toEqual([]);
  });

  it("tells the staff when the athlete reached the limit", async () => {
    const { context } = clientWith([
      { data: [], error: null },
      { data: null, error: { message: "athlete_facts_limit" } },
    ]);
    expect(
      (await runCustomTool(context, "record_athlete_fact", observation))
        .content,
    ).toMatchObject({ code: "invalid_input" });
  });
});
