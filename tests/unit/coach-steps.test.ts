import { describe, expect, it } from "vitest";
import { notifyCopy, notifyOffer } from "../../src/features/coach/notify";
import {
  parseStoredStep,
  stepLine,
  stepReportSchema,
} from "../../src/features/coach/steps";
import { parseStreamEvent } from "../../src/features/coach/stream";

describe("step report validation", () => {
  it("accepts a step inside its total and trims the label", () => {
    expect(
      stepReportSchema.parse({
        step: 2,
        total: 4,
        label: "  semaines de récupération ",
      }),
    ).toEqual({ step: 2, total: 4, label: "semaines de récupération" });
  });

  it.each([
    { step: 5, total: 4, label: "x" },
    { step: 0, total: 4, label: "x" },
    { step: 1, total: 1, label: "x" },
    { step: 1, total: 9, label: "x" },
    { step: 1.5, total: 4, label: "x" },
    { step: 1, total: 4, label: "   " },
    { step: 1, total: 4, label: "x".repeat(61) },
    { step: 1, total: 4, label: "x", extra: true },
  ])("rejects %j", (input) => {
    expect(stepReportSchema.safeParse(input).success).toBe(false);
  });

  it("formats the step line as the board shows it", () => {
    expect(
      stepLine({ step: 2, total: 4, label: "semaines de récupération" }),
    ).toBe("Étape 2 sur 4 : semaines de récupération");
  });
});

describe("stored step", () => {
  it("clamps an overlong label instead of dropping the step", () => {
    const step = parseStoredStep({ step: 1, total: 3, label: "a".repeat(200) });
    expect(step?.label).toHaveLength(60);
  });

  it.each([null, undefined, "2/4", { step: 3, total: 2, label: "x" }, {}])(
    "shows nothing for %j",
    (value) => {
      expect(parseStoredStep(value)).toBeNull();
    },
  );
});

describe("step stream event", () => {
  it("parses a valid step and ignores an invalid one", () => {
    const step = { step: 1, total: 3, label: "bloc de base" };
    expect(parseStreamEvent({ type: "step", step })).toEqual({
      type: "step",
      step,
    });
    expect(
      parseStreamEvent({
        type: "step",
        step: { step: 9, total: 3, label: "x" },
      }),
    ).toBeNull();
  });
});

describe("notify when ready offer", () => {
  it("offers the button when a device is registered and staff pushes are on", () => {
    expect(notifyOffer({ devices: 1, staffEnabled: true })).toBe("available");
  });

  it("explains how to enable push when no device is registered", () => {
    expect(notifyOffer({ devices: 0, staffEnabled: true })).toBe("needs-push");
    expect(notifyOffer({ devices: 0, staffEnabled: false })).toBe("needs-push");
  });

  it("explains that staff pushes are off instead of promising a notification", () => {
    const offer = notifyOffer({ devices: 2, staffEnabled: false });
    expect(offer).toBe("push-off");
    expect(notifyCopy["push-off"]).toMatch(/coupées/);
  });
});
