import { describe, expect, it } from "vitest";
import {
  checkinSummary,
  distanceAt,
  formatGap,
  raceDayView,
  raceDayWindow,
  type RaceDayPlan,
} from "@/features/races/race-day";

const start = Date.UTC(2027, 2, 20, 6, 0);
const hour = 3600;
const at = (seconds: number) => start + seconds * 1000;

const plan: RaceDayPlan = {
  raceId: "race",
  name: "EcoTrail 120K",
  timeZone: "Europe/Paris",
  startEpochMs: start,
  distanceM: 60_000,
  stations: [
    {
      id: "s",
      name: "Saint-Quentin",
      kind: "start",
      distanceM: 0,
      arrivalSeconds: 0,
      stopSeconds: 0,
      cutoffSeconds: null,
      todo: [],
    },
    {
      id: "a",
      name: "Buc",
      kind: "aid",
      distanceM: 20_000,
      arrivalSeconds: 2 * hour,
      stopSeconds: 300,
      cutoffSeconds: 4 * hour,
      todo: ["Remplir 1 flasque iso", "Soupe"],
    },
    {
      id: "b",
      name: "Meudon",
      kind: "aid",
      distanceM: 40_000,
      arrivalSeconds: 4 * hour + 300,
      stopSeconds: 600,
      cutoffSeconds: 7 * hour,
      todo: [],
    },
    {
      id: "f",
      name: "Tour Eiffel",
      kind: "finish",
      distanceM: 60_000,
      arrivalSeconds: 6 * hour + 900,
      stopSeconds: 0,
      cutoffSeconds: null,
      todo: [],
    },
  ],
  climbs: [{ fromM: 30_000, toM: 31_500, label: "Côte de 1,5 km à 16 %" }],
  intakes: [
    { atSeconds: 1 * hour, label: "Gel" },
    { atSeconds: 3 * hour, label: "Barre" },
  ],
  nights: [{ fromSeconds: 6 * hour, toSeconds: 9 * hour }],
  track: [
    [0, 0],
    [2 * hour, 20_000],
    [2 * hour + 300, 20_000],
    [4 * hour + 300, 40_000],
    [4 * hour + 900, 40_000],
    [6 * hour + 900, 60_000],
  ],
};

describe("raceDayWindow", () => {
  it("opens the race-day view from the day before to the day after", () => {
    expect(raceDayWindow("2027-03-20", "2027-03-18")).toBe("before");
    expect(raceDayWindow("2027-03-20", "2027-03-19")).toBe("open");
    expect(raceDayWindow("2027-03-20", "2027-03-21")).toBe("open");
    expect(raceDayWindow("2027-03-20", "2027-03-22")).toBe("after");
    expect(raceDayWindow(null, "2027-03-22")).toBe("before");
  });
});

describe("distanceAt", () => {
  it("reads the planned distance at an elapsed time, standing still at stops", () => {
    expect(distanceAt(plan, hour)).toBe(10_000);
    expect(distanceAt(plan, 2 * hour + 120)).toBe(20_000);
    expect(distanceAt(plan, 99 * hour)).toBe(60_000);
  });
});

describe("formatGap", () => {
  it("signs the gap to the plan in minutes", () => {
    expect(formatGap(240)).toBe("+4 min");
    expect(formatGap(-120)).toBe("−2 min");
    expect(formatGap(20)).toBe("±0");
  });
});

describe("raceDayView", () => {
  it("counts down to the start before the race", () => {
    const view = raceDayView(plan, [], at(-2 * hour));
    expect(view.phase).toBe("before");
    expect(view.title).toBe("Départ dans 2h");
    expect(view.eyebrow).toBe("Départ à 07:00");
    expect(view.next?.name).toBe("Buc");
  });

  it("follows the plan until the first check-in", () => {
    const view = raceDayView(plan, [], at(hour - 600));
    expect(view.eyebrow).toBe("Section 1 sur 3 · estimation");
    expect(view.title).toBe("Saint-Quentin → Buc");
    expect(view.updated).toBe("d’après le plan");
    expect(view.rows).toContainEqual({
      label: "Prochaine prise",
      value: "Gel dans 10 min",
      aside: "08:00",
    });
  });

  it("shifts what is ahead by the delay of the last check-in", () => {
    const view = raceDayView(
      plan,
      [{ waypointId: "a", checkedAt: at(2 * hour + 240) }],
      at(3 * hour),
    );
    expect(view.updated).toBe("mis à jour à Buc, 09:04");
    expect(view.detail).toContain("4 min de retard sur le plan");
    expect(view.next?.id).toBe("b");
    expect(view.rows).toContainEqual({
      label: "Prochain ravito",
      value: "Meudon dans 12 km",
      aside: "vers 11:09",
    });
    expect(view.rows).toContainEqual({
      label: "Barrière de Meudon",
      value: "Marge de 2h51",
      aside: "14:00",
    });
    expect(view.rows).toContainEqual({
      label: "Terrain",
      value: "Côte de 1,5 km à 16 %",
      aside: "marche au km 30",
    });
    expect(view.passages.map((passage) => passage.value)).toEqual([
      "+4 min",
      "11:09",
      "13:19",
    ]);
  });

  it("says the athlete should be at the next station once the plan gets there", () => {
    const view = raceDayView(plan, [], at(2 * hour + 60));
    expect(view.rows).toContainEqual({
      label: "Prochain ravito",
      value: "Buc : tu devrais y être",
      aside: "vers 09:00",
    });
  });

  it("announces the night ahead", () => {
    const view = raceDayView(
      plan,
      [{ waypointId: "b", checkedAt: at(4 * hour + 300) }],
      at(5 * hour + 12 * 60),
    );
    expect(view.rows).toContainEqual({
      label: "Nuit",
      value: "Dans 48 min",
      aside: "frontale prête",
    });
  });

  it("ends at the finish check-in", () => {
    const view = raceDayView(
      plan,
      [{ waypointId: "f", checkedAt: at(6 * hour + 600) }],
      at(7 * hour),
    );
    expect(view.phase).toBe("finished");
    expect(view.title).toBe("Arrivée pointée à 13:10");
    expect(view.next).toBeNull();
  });
});

describe("checkinSummary", () => {
  it("recalculates the barrier margin and the finish from the check-in", () => {
    const summary = checkinSummary(plan, "a", at(2 * hour + 360));
    expect(summary).toEqual({
      title: "Buc · km 20",
      checked: "09:06",
      planned: "prévu 09:00 · 6 min de retard",
      rows: [
        { label: "Barrière de Buc", value: "marge 1h54", aside: null },
        { label: "Arrivée recalculée", value: "13:21", aside: null },
        { label: "Arrêt prévu ici", value: "5 min", aside: null },
      ],
      todo: ["Remplir 1 flasque iso", "Soupe"],
    });
  });
});
