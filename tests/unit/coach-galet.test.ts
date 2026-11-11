import { describe, expect, it } from "vitest";
import { galetFrame } from "@/features/coach/galet";

describe("staff galet", () => {
  it("gives each role its own still silhouette with open eyes", () => {
    const coach = galetFrame("coach", "idle", 0, false);
    const medical = galetFrame("medical", "idle", 0, false);
    expect(coach.body).not.toBe(medical.body);
    expect(coach.eyeHeight).toBe(16);
    expect(coach.haloOpacity).toBe(0);
    expect(galetFrame("coach", "idle", 0, false)).toEqual(coach);
  });

  it("only shows the halo while speaking and looks up-left while thinking", () => {
    expect(galetFrame("coach", "speak", 1).haloOpacity).toBeGreaterThan(0);
    expect(galetFrame("coach", "think", 1).haloOpacity).toBe(0);
    expect(galetFrame("coach", "think", 1).eyeShift.y).toBe(-6);
    expect(galetFrame("coach", "speak", 1).eyeHeight).toBeLessThan(16);
  });
});
