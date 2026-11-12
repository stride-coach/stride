import { describe, expect, test } from "vitest";
import {
  crewLinkPeriod,
  crewLinkTokenSchema,
  crewPage,
  crewSnapshotSchema,
} from "@/features/races/crew-link";
import { ids, stored, waypoints } from "./race-course-fixture";

const snapshot = {
  race: {
    name: "Trail",
    race_date: "2027-03-20",
    race_kind: "trail",
    distance_km: 40,
    elevation_gain_m: null,
    target_duration_seconds: 5 * 3600,
  },
  plan: {
    start_time: "06:00:00",
    ambitious_duration_seconds: 4.5 * 3600,
    cautious_duration_seconds: 5.5 * 3600,
    cutoff_duration_seconds: null,
    walk_grade_percent: 5,
    walk_pace_seconds_per_km: 690,
    aid_stop_seconds: 300,
    water_stop_seconds: 120,
  },
  course: {
    time_zone: stored.timeZone,
    distance_m: stored.distanceM,
    elevation_gain_m: stored.elevationGainM,
    elevation_loss_m: stored.elevationLossM,
    step_m: stored.stepM,
    points: stored.points,
  },
  waypoints: waypoints.map((point) => ({
    id: point.id,
    kind: point.kind,
    name: point.name,
    distance_m: point.distanceM,
    cutoff_time: null,
    services: point.id === ids.aid ? ["assistance"] : [],
    stop_seconds: null,
    crew_access: point.id === ids.aid ? "Parking du gymnase" : null,
    crew_prepare: null,
    crew_reason: null,
  })),
  pace_factors: null,
};

describe("crew tracking link", () => {
  test("is active the day before, of and after the race", () => {
    expect(crewLinkPeriod("2027-03-20")).toBe("actif du 19 mars au 21 mars");
    expect(crewLinkPeriod("2027-03-01")).toBe("actif du 28 février au 2 mars");
    expect(crewLinkPeriod(null)).toBeNull();
  });

  test("only accepts long url-safe tokens", () => {
    expect(crewLinkTokenSchema.safeParse("a".repeat(32)).success).toBe(true);
    expect(crewLinkTokenSchema.safeParse("short").success).toBe(false);
    expect(crewLinkTokenSchema.safeParse(`${"a".repeat(31)}/`).success).toBe(
      false,
    );
  });

  test("rebuilds the crew points from the shared fields only", () => {
    const page = crewPage(crewSnapshotSchema.parse(snapshot))!;
    expect(page.name).toBe("Trail");
    expect(page.start).toBe("06:00");
    expect(page.crew.windows).toBe(true);
    expect(page.crew.points[0]).toMatchObject({
      name: "Ravito 1 · Trappes",
      access: "Parking du gymnase",
      window: expect.stringMatching(/^\d\d:\d\d – \d\d:\d\d$/),
    });
    expect(page.crew.points.at(-1)).toMatchObject({
      planned: "11:00",
      window: "10:30 – 11:30",
    });
  });

  test("shows nothing without a course", () => {
    expect(
      crewPage(crewSnapshotSchema.parse({ ...snapshot, course: null })),
    ).toBeNull();
  });
});
