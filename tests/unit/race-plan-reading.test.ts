import { describe, expect, it } from "vitest";
import { planReading } from "@/features/races/plan-reading";

function station(
  name: string,
  kind: "start" | "aid" | "finish",
  distanceM: number,
  clockMinutes: number,
  marginSeconds: number | null = null,
) {
  return { name, kind, distanceM, clockMinutes, marginSeconds };
}

const stations = [
  station("Départ", "start", 0, 480),
  station("Buc", "aid", 20_000, 616, 3 * 3600),
  station("Chaville", "aid", 47_000, 817, 2 * 3600),
  station("Arrivée", "finish", 120_000, 1529),
];

describe("plan reading", () => {
  it("names the arrival and the tightest cutoff", () => {
    expect(planReading({ stations, rain: [], night: [] })).toBe(
      "Tu arrives vers 01:29, avec 2h d’avance à Chaville, ta barrière la plus serrée.",
    );
  });

  it("warns when a cutoff margin is short", () => {
    const tight = stations.map((item) =>
      item.name === "Chaville" ? { ...item, marginSeconds: 20 * 60 } : item,
    );
    expect(planReading({ stations: tight, rain: [], night: [] })).toBe(
      "Tu arrives vers 01:29, mais ta marge à Chaville n’est que de 20 min.",
    );
  });

  it("says when the rain comes and where to take the jacket", () => {
    expect(
      planReading({
        stations,
        rain: [{ fromM: 52_000, toM: 63_000 }],
        night: [{ fromM: 90_000, toM: 120_000 }],
      }),
    ).toMatch(/Les averses arrivent au km 52 : veste dès Chaville\.$/);
  });

  it("falls back to the night, and to the start", () => {
    expect(
      planReading({
        stations,
        rain: [],
        night: [{ fromM: 8_500, toM: 30_000 }],
      }),
    ).toMatch(/La nuit tombe au km 8,5 : frontale dès le départ\.$/);
    expect(
      planReading({
        stations: [
          station("Départ", "start", 0, 480),
          station("Arrivée", "finish", 10_000, 540, 3600),
        ],
        rain: [],
        night: [],
      }),
    ).toBe("Tu arrives vers 09:00, 1h avant la barrière.");
  });
});
