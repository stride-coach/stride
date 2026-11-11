import { describe, expect, it } from "vitest";
import {
  parseThemePreference,
  resolveTheme,
  themeScript,
} from "../../src/features/theme/model";

describe("theme preference", () => {
  it("keeps known preferences and falls back to the system theme", () => {
    expect(parseThemePreference("light")).toBe("light");
    expect(parseThemePreference("system")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
    expect(parseThemePreference("sepia")).toBe("system");
  });

  it("follows the operating system only for the system preference", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
  });

  it("applies every stored preference before first paint", () => {
    const cases = [
      ["dark", true, "dark"],
      ["light", false, "light"],
      ["system", true, "light"],
      ["system", false, "dark"],
      [null, true, "light"],
      ["sepia", false, "dark"],
    ] as const;
    for (const [stored, prefersLight, expected] of cases) {
      const root = { dataset: {} as Record<string, string> };
      new Function("localStorage", "matchMedia", "document", themeScript)(
        { getItem: () => stored },
        () => ({ matches: prefersLight }),
        { documentElement: root },
      );
      expect(root.dataset.theme).toBe(expected);
    }
  });
});
