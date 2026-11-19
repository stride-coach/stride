import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createGear: vi.fn(),
  updateGear: vi.fn(),
  readShoe: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/garmin/session", () => ({
  getGarminClient: () => ({
    createGear: mocks.createGear,
    updateGear: mocks.updateGear,
  }),
}));
vi.mock("@/server/onboarding/context", () => ({
  getOnboardingContext: async () => athlete,
}));
vi.mock("@/server/gear/shoes", async (original) => ({
  ...(await original<object>()),
  readShoe: mocks.readShoe,
}));

const athlete = {
  userId: "a4000000-0000-4000-8000-00000000000a",
  accessToken: "token",
  email: null,
  client: {
    from: () => ({
      insert: (row: object) => {
        mocks.insert(row);
        return {
          select: () => ({
            single: async () => ({ data: { id: fresh }, error: null }),
          }),
        };
      },
      update: (row: object) => ({
        eq: async (column: string, value: string) =>
          mocks.update(row, column, value),
      }),
    }),
  },
};

const worn = "d1000000-0000-4000-8000-000000000001";
const fresh = "d1000000-0000-4000-8000-000000000009";
const wornGear = "a".repeat(32);
const freshGear = "c".repeat(32);

const spec = {
  brand: "Adidas",
  model: "Adizero Evo SL",
  version: "3",
  category: "daily",
  terrain: "road",
  description: "Ta paire de tous les jours.",
  sizeEu: 43,
  lifespanKm: 700,
} as const;

const input = {
  id: worn,
  shoe: {
    spec,
    currentKm: 0,
    firstUseDate: "2026-11-19",
    garminDefault: "running",
    suggested: [],
  },
};

describe("replace a pair", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-19T10:00:00Z"));
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readShoe.mockResolvedValue({
      id: worn,
      garminGearUuid: wornGear,
      firstUseDate: "2026-05-02",
      retiredOn: null,
    });
    mocks.createGear.mockResolvedValue({
      ok: true,
      value: { gearUuid: freshGear },
    });
    mocks.updateGear.mockResolvedValue({ ok: true, value: {} });
    mocks.update.mockResolvedValue({ error: null });
  });

  it("creates the fresh pair at 0 km, then retires the worn one", async () => {
    const { replaceShoe } = await import("@/server/gear/actions");
    await expect(replaceShoe(input)).resolves.toEqual({
      status: "saved",
      id: fresh,
    });
    expect(mocks.createGear).toHaveBeenCalledWith(
      { accessToken: "token" },
      expect.objectContaining({
        name: "Adidas Adizero Evo SL 3",
        first_use_date: "2026-11-19",
        default_activity_types: ["running", "treadmill_running"],
      }),
    );
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        garmin_gear_uuid: freshGear,
        starting_distance_m: 0,
        first_use_date: "2026-11-19",
      }),
    );
    expect(mocks.updateGear).toHaveBeenCalledWith(
      { accessToken: "token" },
      wornGear,
      { status: "retired" },
    );
    expect(mocks.update).toHaveBeenCalledWith(
      { retired_on: "2026-11-19" },
      "id",
      worn,
    );
  });

  it("changes nothing when Garmin cannot create the fresh pair", async () => {
    mocks.createGear.mockResolvedValue({
      ok: false,
      failure: { code: "unavailable" },
    });
    const { replaceShoe } = await import("@/server/gear/actions");
    await expect(replaceShoe(input)).resolves.toEqual({
      status: "garmin-unavailable",
    });
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.updateGear).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("keeps the fresh pair and says so when the worn one stays active", async () => {
    mocks.updateGear.mockResolvedValue({
      ok: false,
      failure: { code: "unavailable" },
    });
    const { replaceShoe } = await import("@/server/gear/actions");
    await expect(replaceShoe(input)).resolves.toEqual({
      status: "saved",
      id: fresh,
      previousStillActive: true,
    });
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("refuses to replace a pair that is already retired", async () => {
    mocks.readShoe.mockResolvedValue({
      id: worn,
      garminGearUuid: wornGear,
      firstUseDate: "2026-05-02",
      retiredOn: "2026-11-01",
    });
    const { replaceShoe } = await import("@/server/gear/actions");
    await expect(replaceShoe(input)).resolves.toEqual({ status: "invalid" });
    expect(mocks.createGear).not.toHaveBeenCalled();
  });

  it("reports a pair that no longer exists", async () => {
    mocks.readShoe.mockResolvedValue(null);
    const { replaceShoe } = await import("@/server/gear/actions");
    await expect(replaceShoe(input)).resolves.toEqual({ status: "not-found" });
    expect(mocks.createGear).not.toHaveBeenCalled();
  });
});
