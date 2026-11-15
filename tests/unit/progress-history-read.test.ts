import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { readAll } = await import("@/server/progress/history");

describe("progress history reads", () => {
  it("reads every page until a short one", async () => {
    const pages = [Array.from({ length: 1000 }, (_, index) => index), [1000]];
    const page = vi.fn(async () => ({
      data: pages.shift() ?? [],
      error: null,
    }));
    await expect(readAll(page)).resolves.toHaveLength(1001);
    expect(page).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it("fails instead of showing a partial history when a read fails", async () => {
    await expect(
      readAll(async () => ({ data: null, error: { message: "timeout" } })),
    ).rejects.toThrow("Unable to read progress history");
  });
});
