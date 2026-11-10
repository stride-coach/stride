import { describe, expect, it } from "vitest";
import { plagePositions } from "../../src/components/stride/plage-scale";

describe("habitual range positions", () => {
  it("places the band and today's point on the scale", () => {
    expect(
      plagePositions({ min: 40, max: 70, low: 52, high: 64, value: 46 }),
    ).toEqual({ bandStart: 40, bandWidth: 40, point: 20 });
  });

  it("keeps a value outside the scale on the edge", () => {
    expect(
      plagePositions({ min: 0, max: 10, low: 2, high: 4, value: 14 }).point,
    ).toBe(100);
    expect(
      plagePositions({ min: 0, max: 10, low: 2, high: 4, value: -3 }).point,
    ).toBe(0);
  });

  it("accepts a reversed range and an empty scale", () => {
    expect(
      plagePositions({ min: 0, max: 100, low: 60, high: 20, value: 50 }),
    ).toEqual({ bandStart: 20, bandWidth: 40, point: 50 });
    expect(
      plagePositions({ min: 5, max: 5, low: 5, high: 5, value: 5 }),
    ).toEqual({ bandStart: 0, bandWidth: 100, point: 50 });
  });

  it("falls back to a centred point when a bound is not a number", () => {
    expect(
      plagePositions({ min: 0, max: 10, low: 2, high: 4, value: Number.NaN }),
    ).toEqual({ bandStart: 0, bandWidth: 100, point: 50 });
  });
});
