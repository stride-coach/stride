import { describe, expect, it } from "vitest";
import { countUpText } from "../../src/components/stride/count-up-text";

describe("count-up text", () => {
  it("starts every number at zero and keeps the French formatting", () => {
    expect(countUpText("11,3 km", 0)).toBe("0,0 km");
    expect(countUpText("12\u202f345 pas", 0)).toBe("0 pas");
    expect(countUpText("1h40", 0)).toBe("0h00");
    expect(countUpText("82 %", 0)).toBe("0 %");
  });

  it("ends on the exact source text", () => {
    for (const text of ["11,3 km", "12\u202f345 pas", "1h40", "3:05:12", "–"])
      expect(countUpText(text, 1)).toBe(text);
  });

  it("eases out and keeps decimals, grouping and padding mid-way", () => {
    expect(countUpText("100", 0.5)).toBe("88");
    expect(countUpText("11,3 km", 0.5)).toBe("9,9 km");
    expect(countUpText("12\u202f345 pas", 0.5)).toBe("10\u202f802 pas");
    expect(countUpText("3:05:12", 0.5)).toMatch(/^\d:\d{2}:\d{2}$/);
  });

  it("leaves text without numbers untouched", () => {
    expect(countUpText("–", 0)).toBe("–");
  });
});
