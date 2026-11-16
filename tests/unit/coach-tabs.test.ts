import { describe, expect, it } from "vitest";
import { currentCoachTab } from "../../src/features/coach/tabs";

describe("coach tabs", () => {
  it("keeps threads and topics under Conversation", () => {
    expect(currentCoachTab("/coach")).toBe("/coach");
    expect(currentCoachTab("/coach/c0c0c0c0-0000-4000-8000-000000000001")).toBe(
      "/coach",
    );
  });

  it("finds the decisions and staff sections", () => {
    expect(currentCoachTab("/coach/decisions")).toBe("/coach/decisions");
    expect(currentCoachTab("/coach/team")).toBe("/coach/team");
  });
});
