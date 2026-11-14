import { describe, expect, it } from "vitest";
import {
  coachContextFromPath,
  coachContextHref,
} from "@/features/coach/request";

const race = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const activity = "aaaaaaaa-aaaa-4aaa-8aaa-000000000004";

describe("coachContextFromPath", () => {
  it("reads the race, activity or session the screen shows", () => {
    expect(coachContextFromPath(`/races/${race}`)).toEqual({
      kind: "race",
      id: race,
    });
    expect(coachContextFromPath(`/races/${race}/weather`)).toEqual({
      kind: "race",
      id: race,
    });
    expect(coachContextFromPath(`/activities/${activity}`)).toEqual({
      kind: "activity",
      id: activity,
    });
    expect(coachContextFromPath("/plan/sessions/s-2026-10-20-1")).toEqual({
      kind: "session",
      id: "s-2026-10-20-1",
    });
    expect(
      coachContextFromPath("/plan", "?session=s-2026-10-20-1&week=2026-10-19"),
    ).toEqual({ kind: "session", id: "s-2026-10-20-1" });
    expect(
      coachContextFromPath("/plan/calendar", "session=s-2026-10-20-1"),
    ).toEqual({ kind: "session", id: "s-2026-10-20-1" });
  });

  it("ignores screens without a single subject and malformed ids", () => {
    for (const path of [
      "/today",
      "/races",
      "/races/new",
      "/activities",
      "/activities/gear",
      "/plan",
      "/plan/sessions/Not%20a%20key",
      "/plan/sessions/%E0",
      "/coach",
    ])
      expect(coachContextFromPath(path)).toBeNull();
    expect(coachContextFromPath("/plan", "session=Bad Key")).toBeNull();
    expect(coachContextFromPath("/today", "session=s-2026-10-20-1")).toBeNull();
  });
});

describe("coachContextHref", () => {
  it("opens the coach with the context attached", () => {
    expect(coachContextHref(null)).toBe("/coach");
    expect(coachContextHref({ kind: "race", id: race })).toBe(
      `/coach?race=${race}`,
    );
    expect(coachContextHref({ kind: "activity", id: activity })).toBe(
      `/coach?activity=${activity}`,
    );
    expect(coachContextHref({ kind: "session", id: "s-2026-10-20-1" })).toBe(
      "/coach?session=s-2026-10-20-1",
    );
  });
});
