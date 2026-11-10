import { describe, expect, it } from "vitest";
import { cn } from "../../src/lib/utils";

describe("class merging with Dense tokens", () => {
  it("keeps a Stride type size next to a text colour", () => {
    expect(cn("text-label text-muted-foreground")).toBe(
      "text-label text-muted-foreground",
    );
    expect(cn("text-metric", "text-warning")).toBe("text-metric text-warning");
    expect(
      cn("size-8 text-body-lg", "bg-primary text-primary-foreground"),
    ).toBe("size-8 text-body-lg bg-primary text-primary-foreground");
    expect(cn("text-verdict", "text-foreground")).toBe(
      "text-verdict text-foreground",
    );
  });

  it("lets a later Stride size or radius override an earlier one", () => {
    expect(cn("text-body", "text-body-lg")).toBe("text-body-lg");
    expect(cn("text-title", "text-micro")).toBe("text-micro");
    expect(cn("rounded-md", "rounded-lg")).toBe("rounded-lg");
    expect(cn("rounded-2xl", "rounded-none")).toBe("rounded-none");
  });
});
