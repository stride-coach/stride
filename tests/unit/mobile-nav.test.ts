import { describe, expect, it } from "vitest";
import {
  isActivePath,
  showsTabBar,
} from "../../src/features/app-shell/mobile-nav";
import {
  coachActionLabel,
  coachWaiting,
} from "../../src/features/app-shell/coach-attention";

describe("isActivePath", () => {
  it("matches the destination and its descendants", () => {
    expect(isActivePath("/activities", "/activities")).toBe(true);
    expect(isActivePath("/activities/abc", "/activities")).toBe(true);
    expect(isActivePath("/coach/team", "/coach")).toBe(true);
  });

  it("ignores routes that only share a prefix", () => {
    expect(isActivePath("/planning", "/plan")).toBe(false);
    expect(isActivePath("/today", "/plan")).toBe(false);
  });
});

describe("showsTabBar", () => {
  it("shows the tab bar on the app screens", () => {
    expect(showsTabBar("/today")).toBe(true);
    expect(showsTabBar("/races/abc")).toBe(true);
    expect(showsTabBar("/races/abc/day-plan")).toBe(true);
  });

  it("hides it during the race day", () => {
    expect(showsTabBar("/races/abc/day")).toBe(false);
    expect(showsTabBar("/races/abc/day/")).toBe(false);
  });
});

describe("coachActionLabel", () => {
  it("names the pending items", () => {
    expect(coachActionLabel({ questions: 2, proposals: 1 })).toBe(
      "Coach, 2 questions et 1 proposition en attente",
    );
  });

  it.each([null, { questions: 0, proposals: 0 }])(
    "stays « Coach » without pending items (%o)",
    (attention) => {
      expect(coachActionLabel(attention)).toBe("Coach");
      expect(coachWaiting(attention)).toBe(0);
    },
  );
});
