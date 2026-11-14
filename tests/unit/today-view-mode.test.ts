import { describe, expect, it } from "vitest";
import { parseTodayMode, todayHref } from "@/features/today/view-mode";

describe("today view mode", () => {
  it("reads the week view and its week from the URL", () => {
    expect(parseTodayMode({ view: "week", week: "2026-10-26" })).toEqual({
      mode: "week",
      week: "2026-10-26",
    });
  });

  it("falls back to the day view and ignores a malformed week", () => {
    expect(parseTodayMode({})).toEqual({ mode: "day", week: null });
    expect(parseTodayMode({ view: "month", week: "lundi" })).toEqual({
      mode: "day",
      week: null,
    });
    expect(parseTodayMode({ view: ["week", "day"] })).toEqual({
      mode: "week",
      week: null,
    });
  });

  it("builds the URL of each view", () => {
    expect(todayHref("day")).toBe("/today");
    expect(todayHref("week")).toBe("/today?view=week");
    expect(todayHref("week", "2026-10-26")).toBe(
      "/today?view=week&week=2026-10-26",
    );
  });
});
