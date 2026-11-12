import { describe, expect, test } from "vitest";
import { roadbookRows, roadbookTotals } from "@/features/races/axis";
import {
  printedRoadbook,
  roadbookOptionsSchema,
  roadbookQuery,
} from "@/features/races/printed-roadbook";
import { model, plan, race, target, timeline } from "./race-course-fixture";

function printed(estimate = false) {
  return printedRoadbook({
    race,
    planned: target,
    timeline,
    rows: roadbookRows(timeline, null),
    totals: roadbookTotals(timeline, model.course.distanceM),
    walkGradePercent: plan.walkGradePercent,
    rain: [{ fromM: 12_340, toM: 18_760 }],
    estimate,
  });
}

describe("printed roadbook", () => {
  test("follows the plan at print time", () => {
    const roadbook = printed();
    expect(roadbook.title).toBe("Trail");
    expect(roadbook.subtitle).toMatch(/· départ 06:00 · objectif 5h00$/);
    expect(roadbook.facts).toEqual([
      "Marche dès 5 %",
      expect.stringMatching(/^Nuit jusqu’à 0\d:\d\d$/),
      `Arrivée ${roadbook.totals.finish}`,
    ]);
    expect(roadbook.rows.map((row) => row.passage)).toEqual(
      roadbookRows(timeline, null).map((row) => row.passage),
    );
    expect(roadbook.barriers).toBe("Ravito 1 · Trappes 11:00");
    expect(roadbook.rain).toBe("km 12,3 à 18,8");
    expect(roadbook.band.map((stop) => stop.name)).toEqual(
      timeline.stations.slice(1).map((station) => station.name),
    );
    expect(roadbook.band[0]).toMatchObject({ cutoff: "11:00" });
  });

  test("marks every passage as an estimate without a course", () => {
    const roadbook = printed(true);
    expect(roadbook.estimate).toBe(true);
    for (const row of roadbook.rows) expect(row.passage).toMatch(/^≈ /);
    for (const stop of roadbook.band) expect(stop.passage).toMatch(/^≈ /);
    expect(roadbook.totals.finish).toMatch(/^≈ /);
  });

  test("reads the print options from the address", () => {
    expect(roadbookOptionsSchema.parse({})).toEqual({
      format: "a4",
      intake: true,
      weather: true,
      walk: true,
    });
    const options = roadbookOptionsSchema.parse({
      format: "band",
      weather: "0",
      intake: "oops",
    });
    expect(options).toEqual({
      format: "band",
      intake: true,
      weather: false,
      walk: true,
    });
    expect(roadbookQuery(options)).toBe(
      "format=band&intake=1&weather=0&walk=1",
    );
  });
});
